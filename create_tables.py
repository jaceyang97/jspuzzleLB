import sqlite3

# Connect to the SQLite database (or create it if it doesn't exist)
connection = sqlite3.connect('puzzle_demographics.db')
cursor = connection.cursor()

# Drop existing tables if they exist
cursor.execute('DROP TABLE IF EXISTS puzzles')
cursor.execute('DROP TABLE IF EXISTS submissions')
cursor.execute('DROP TABLE IF EXISTS users')

# Create puzzles table with a UNIQUE constraint
cursor.execute('''
CREATE TABLE puzzles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date DATE NOT NULL,
    name TEXT NOT NULL,
    solution_url TEXT,
    data_directory TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(date, name)
)
''')

# Create submissions table with foreign keys
cursor.execute('''
CREATE TABLE submissions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    puzzle_id INTEGER,
    user_id INTEGER,
    submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(puzzle_id) REFERENCES puzzles(id),
    FOREIGN KEY(user_id) REFERENCES users(id)
)
''')

# Create users table with columns for original and normalized names
cursor.execute('''
CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    original_name TEXT NOT NULL,
    normalized_name TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(normalized_name)
)
''')

# Commit the changes and close the connection
connection.commit()
connection.close()

print("Database and tables created successfully.")
