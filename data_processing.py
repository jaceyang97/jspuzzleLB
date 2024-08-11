import sqlite3
import matplotlib.pyplot as plt
import seaborn as sns

# Connect to the SQLite database
connection = sqlite3.connect('puzzle_demographics.db')
cursor = connection.cursor()

def count_unique_users():
    """
    Count the number of unique users in the database.
    """
    cursor.execute('SELECT COUNT(DISTINCT original_name) FROM users')
    unique_users_count = cursor.fetchone()[0]
    return unique_users_count

def top_k_users(k):
    """
    Retrieve the top k users with the most submissions.
    Returns a list of tuples (user_name, submission_count).
    """
    cursor.execute('''
        SELECT users.original_name, COUNT(submissions.id) as submission_count
        FROM submissions
        JOIN users ON submissions.user_id = users.id
        GROUP BY users.id
        ORDER BY submission_count DESC
        LIMIT ?
    ''', (k,))
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

def plot_log_scale_distribution(submission_counts):
    """
    Plot the frequency distribution of user submissions using a logarithmic scale with Seaborn,
    with x-ticks set to label at specific intervals and centered under each bar.
    """
    plt.figure(figsize=(10, 6))

    # Plotting with bins of 1
    ax = sns.histplot(submission_counts, bins=range(1, max(submission_counts) + 2), color='#bcf5bc', edgecolor='black', log_scale=(False, True))
    plt.title('Log-Scaled Frequency Distribution of Submission Counts')
    plt.xlabel('Number of Submissions')
    plt.ylabel('Log Frequency')
    
    # Setting x-ticks to display at specific intervals (1, 5, 10, ...)
    max_count = max(submission_counts)
    tick_values = [x for x in range(1, max_count + 1) if x == 1 or x % 5 == 0]
    ax.set_xticks(tick_values)  # Set where the ticks will appear

    # Set x-tick labels to ensure they're only on the ticks we want and centered under the bars
    ax.set_xticklabels(tick_values)

    plt.grid(axis='y', linestyle='--', alpha=0.7)
    plt.show()

def count_users_with_high_submissions(submission_counts, threshold=20):
    """
    Count the number of users with submissions greater than or equal to a given threshold.
    """
    count = sum(1 for count in submission_counts if count >= threshold)
    return count

# Use the functions to retrieve and display information

# 1. Number of unique users
unique_users_count = count_unique_users()
print(f"\nNumber of unique users: {unique_users_count}")

# 2. Top k users with the most submissions
k = 32  # Set k to the desired number of top users
print(f"\nTop {k} users with their submission counts:")
top_users = top_k_users(k)
for user_name, submission_count in top_users:
    print(f"{user_name}: {submission_count}")

# 3. Frequency distribution of submissions
submission_counts = submission_frequency_distribution()
plot_log_scale_distribution(submission_counts)

# 4. Count users with submissions greater than 20
high_submission_count = count_users_with_high_submissions(submission_counts, threshold=20)
print(f"Number of users with submissions greater than 20: {high_submission_count}")

# Close the database connection
connection.close()
