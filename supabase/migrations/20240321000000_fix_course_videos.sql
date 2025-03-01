-- First, let's make sure we handle any existing data
DO $$ 
BEGIN
    -- Check if 'order' column exists and rename it to order_index
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'course_videos' 
        AND column_name = 'order'
    ) THEN
        ALTER TABLE course_videos RENAME COLUMN "order" TO order_index;
    END IF;

    -- If neither 'order' nor 'order_index' exists, add order_index
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'course_videos' 
        AND column_name = 'order_index'
    ) THEN
        ALTER TABLE course_videos ADD COLUMN order_index integer NOT NULL DEFAULT 1;
    END IF;

    -- Make sure the column is NOT NULL
    ALTER TABLE course_videos ALTER COLUMN order_index SET NOT NULL;

    -- Add an index for better performance
    IF NOT EXISTS (
        SELECT 1
        FROM pg_indexes
        WHERE tablename = 'course_videos'
        AND indexname = 'idx_course_videos_order'
    ) THEN
        CREATE INDEX idx_course_videos_order ON course_videos(course_id, order_index);
    END IF;

END $$; 