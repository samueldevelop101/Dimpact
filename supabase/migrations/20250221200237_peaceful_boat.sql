/*
  # Initial Schema Setup for Learning Platform

  1. New Tables
    - profiles
      - id (uuid, primary key)
      - email (text, unique)
      - role (text)
      - created_at (timestamp)
    
    - courses
      - id (uuid, primary key)
      - title (text)
      - description (text)
      - instructor_id (uuid, foreign key)
      - created_at (timestamp)
    
    - enrollments
      - id (uuid, primary key)
      - user_id (uuid, foreign key)
      - course_id (uuid, foreign key)
      - status (text)
      - progress (integer)
      - created_at (timestamp)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users
*/

-- Create profiles table
CREATE TABLE profiles (
  id uuid PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  role text NOT NULL CHECK (role IN ('student', 'instructor', 'admin')),
  created_at timestamptz DEFAULT now()
);

-- Create courses table
CREATE TABLE courses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  instructor_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now()
);

-- Create enrollments table
CREATE TABLE enrollments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  course_id uuid REFERENCES courses(id) ON DELETE CASCADE,
  status text NOT NULL CHECK (status IN ('enrolled', 'completed', 'dropped')),
  progress integer DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, course_id)
);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE enrollments ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can read their own profile"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- Courses policies
CREATE POLICY "Anyone can view courses"
  ON courses
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Instructors can create courses"
  ON courses
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role = 'instructor'
    )
  );

-- Enrollments policies
CREATE POLICY "Students can view their own enrollments"
  ON enrollments
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Students can enroll in courses"
  ON enrollments
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role = 'student'
    )
  );