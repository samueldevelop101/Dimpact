/*
  # Add course videos support

  1. New Tables
    - `course_videos`
      - `id` (uuid, primary key)
      - `course_id` (uuid, references courses)
      - `title` (text)
      - `youtube_url` (text)
      - `order` (integer)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on `course_videos` table
    - Add policies for instructors to manage videos
    - Add policies for enrolled students to view videos
*/

CREATE TABLE course_videos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid REFERENCES courses(id) ON DELETE CASCADE,
  title text NOT NULL,
  youtube_url text NOT NULL,
  "order" integer NOT NULL,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT valid_youtube_url CHECK (youtube_url ~* '^https?:\/\/(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/)[a-zA-Z0-9_-]+')
);

ALTER TABLE course_videos ENABLE ROW LEVEL SECURITY;

-- Instructors can manage their course videos
CREATE POLICY "Instructors can manage their course videos"
  ON course_videos
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM courses
      WHERE courses.id = course_videos.course_id
      AND courses.instructor_id = auth.uid()
    )
  );

-- Students can view videos of enrolled courses
CREATE POLICY "Students can view enrolled course videos"
  ON course_videos
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM enrollments
      WHERE enrollments.course_id = course_videos.course_id
      AND enrollments.user_id = auth.uid()
    )
  );