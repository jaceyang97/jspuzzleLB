import sqlite3
import matplotlib.pyplot as plt

# Connect to the SQLite database
connection = sqlite3.connect('puzzle_demographics.db')
cursor = connection.cursor()

def count_unique_users():
    """
    Count the number of unique users in the database.
    """
    cursor.execute('SELECT COUNT(DISTINCT name) FROM users')
    unique_users_count = cursor.fetchone()[0]
    return unique_users_count

def top_50_users():
    """
    Retrieve the top 50 users with the most submissions.
    Returns a list of tuples (user_name, submission_count).
    """
    cursor.execute('''
        SELECT users.name, COUNT(submissions.id) as submission_count
        FROM submissions
        JOIN users ON submissions.user_id = users.id
        GROUP BY users.id
        ORDER BY submission_count DESC
        LIMIT 50
    ''')
    top_users = cursor.fetchall()
    return top_users

def submission_frequency_distribution():
    """
    Calculate the distribution of submission frequencies.
    Returns a list of submission counts for each user.
    """
    cursor.execute('''
        SELECT COUNT(submissions.id) as submission_count
        FROM submissions
        JOIN users ON submissions.user_id = users.id
        GROUP BY users.id
    ''')
    submission_counts = [row[0] for row in cursor.fetchall()]
    return submission_counts

def plot_frequency_distribution(submission_counts):
    """
    Plot the frequency distribution of user submissions.
    """
    plt.figure(figsize=(10, 6))
    plt.hist(submission_counts, bins=range(1, max(submission_counts) + 2), edgecolor='black')
    plt.title('Frequency Distribution of Submission Counts')
    plt.xlabel('Number of Submissions')
    plt.ylabel('Frequency')
    plt.xticks(range(1, max(submission_counts) + 1))
    plt.grid(axis='y', linestyle='--', alpha=0.7)
    plt.show()

# Use the functions to retrieve and display information

# 1. Number of unique users
unique_users_count = count_unique_users()
print(f"\nNumber of unique users: {unique_users_count}")

# 2. Top 50 users with the most submissions
print("\nTop 50 users with their submission counts:")
top_users = top_50_users()
for user_name, submission_count in top_users:
    print(f"{user_name}: {submission_count}")

# 3. Frequency distribution of submissions
submission_counts = submission_frequency_distribution()
plot_frequency_distribution(submission_counts)

# Close the database connection
connection.close()
