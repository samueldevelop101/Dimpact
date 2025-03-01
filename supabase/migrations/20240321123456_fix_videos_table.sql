-- First drop dependent tables/constraints
DROP TABLE IF EXISTS video_progress CASCADE;

-- Recreate the course_videos table
DROP TABLE IF EXISTS course_videos CASCADE;

CREATE TABLE course_videos (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id uuid REFERENCES courses(id) ON DELETE CASCADE NOT NULL,
    title text NOT NULL,
    video_url text NOT NULL,
    order_index integer NOT NULL,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    CONSTRAINT valid_video_url CHECK (video_url ~* '^https?:\/\/(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/)[a-zA-Z0-9_-]+')
);

-- Recreate the video_progress table
CREATE TABLE video_progress (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users ON DELETE CASCADE NOT NULL,
    video_id uuid REFERENCES course_videos(id) ON DELETE CASCADE NOT NULL,
    watched_seconds integer DEFAULT 0,
    is_completed boolean DEFAULT false,
    last_watched_at timestamptz DEFAULT now(),
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    UNIQUE(user_id, video_id)
);

-- Create indexes for better performance
CREATE INDEX idx_course_videos_order ON course_videos(course_id, order_index);
CREATE INDEX idx_video_progress_user ON video_progress(user_id);
CREATE INDEX idx_video_progress_video ON video_progress(video_id);

-- Enable RLS
ALTER TABLE course_videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE video_progress ENABLE ROW LEVEL SECURITY;

-- Add policies for course_videos
CREATE POLICY "Instructors can manage their course videos"
    ON course_videos FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM courses
            WHERE courses.id = course_videos.course_id
            AND courses.instructor_id = auth.uid()
        )
    );

CREATE POLICY "Students can view enrolled course videos"
    ON course_videos FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM enrollments
            WHERE enrollments.course_id = course_videos.course_id
            AND enrollments.user_id = auth.uid()
        )
    );

-- Add policies for video_progress
CREATE POLICY "Users can manage their own video progress"
    ON video_progress FOR ALL
    USING (user_id = auth.uid());

-- Create trigger for updating updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_course_videos_updated_at
    BEFORE UPDATE ON course_videos
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_video_progress_updated_at
    BEFORE UPDATE ON video_progress
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Safely modify the course_videos table without dropping
DO $$ 
BEGIN
    -- Rename youtube_url to video_url if it exists
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'course_videos' 
        AND column_name = 'youtube_url'
    ) THEN
        ALTER TABLE course_videos RENAME COLUMN youtube_url TO video_url;
    END IF;

    -- Add video_url column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'course_videos' 
        AND column_name = 'video_url'
    ) THEN
        ALTER TABLE course_videos ADD COLUMN video_url text NOT NULL;
    END IF;

    -- Add order_index column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'course_videos' 
        AND column_name = 'order_index'
    ) THEN
        ALTER TABLE course_videos ADD COLUMN order_index integer;
    END IF;

    -- Update any null order_index values with a sequential number
    WITH numbered_videos AS (
        SELECT id, ROW_NUMBER() OVER (PARTITION BY course_id ORDER BY created_at) as row_num
        FROM course_videos
        WHERE order_index IS NULL
    )
    UPDATE course_videos cv
    SET order_index = nv.row_num
    FROM numbered_videos nv
    WHERE cv.id = nv.id;

    -- Now make order_index NOT NULL after ensuring all rows have a value
    ALTER TABLE course_videos ALTER COLUMN order_index SET NOT NULL;

    -- Create index if it doesn't exist
    IF NOT EXISTS (
        SELECT 1
        FROM pg_indexes
        WHERE tablename = 'course_videos'
        AND indexname = 'idx_course_videos_order'
    ) THEN
        CREATE INDEX idx_course_videos_order ON course_videos(course_id, order_index);
    END IF;

    -- Add URL validation constraint if it doesn't exist
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'valid_video_url'
    ) THEN
        ALTER TABLE course_videos ADD CONSTRAINT valid_video_url 
        CHECK (video_url ~* '^https?:\/\/(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/)[a-zA-Z0-9_-]+');
    END IF;

END $$; 