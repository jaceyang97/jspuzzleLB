import sqlite3
import requests
from bs4 import BeautifulSoup
from datetime import datetime
import re
from tqdm import tqdm

# Connect to the SQLite database
connection = sqlite3.connect('puzzle_demographics.db')
cursor = connection.cursor()

def fetch_correct_submissions(data_directory):
    json_url = f"https://www.janestreet.com/puzzles/{data_directory}-leaderboard.json"
    json_response = requests.get(json_url)
    if json_response.status_code != 200:
        return []

    json_data = json_response.json()
    leaders = json_data.get('leaders', [])
    # Clean names and remove annotations
    cleaned_names = [re.sub(r'\s*\([^)]*\)', '', leader).strip() for leader in leaders]
    return cleaned_names

def fetch_puzzles(url):
    puzzles = []
    response = requests.get(url)
    if response.status_code != 200:
        return puzzles  # Return an empty list if the page doesn't exist or there's an error

    soup = BeautifulSoup(response.text, 'html.parser')
    container = soup.select_one('body > div.site-wrap > main > div > div.container > div > div')
    rows = container.select('div.row')

    for row in rows:
        date_tag = row.select_one('.left span.date')
        name_tag = row.select_one('.left span.name')
        solution_link_tag = row.select_one('.right a.solution-link')

        if date_tag and name_tag:
            date_text = date_tag.get_text(strip=True).rstrip(':')
            date = datetime.strptime(date_text, "%B %Y")
            name = name_tag.get_text(strip=True)
        else:
            continue

        solution_url = None
        data_directory = None
        correct_submissions = None

        if solution_link_tag and solution_link_tag.has_attr('href'):
            solution_url = 'https://www.janestreet.com' + solution_link_tag['href']
            submissions_tag = BeautifulSoup(requests.get(solution_url).text, 'html.parser').select_one('p.correct-submissions')
            if submissions_tag and submissions_tag.has_attr('data-directory'):
                data_directory = submissions_tag['data-directory']
                if date >= datetime(2015, 11, 1):
                    correct_submissions = fetch_correct_submissions(data_directory)
                else:
                    correct_submissions = "Submissions not available before November 2015"
            else:
                correct_submissions = "Solution link not available or invalid data-directory"
        else:
            solution_url = "Solution URL not available"

        puzzles.append((date, name, solution_url, data_directory, correct_submissions))

    return puzzles


def scrape_puzzles(base_url, max_pages=None):
    all_puzzles = []
    page = 1
    pbar = tqdm(desc="Scraping Puzzles", unit="puzzle")  # Initialize tqdm without total

    while True:
        page_url = f"{base_url}page{page}/index.html" if page > 1 else f"{base_url}index.html"
        puzzles = fetch_puzzles(page_url)
        if not puzzles:
            break
        all_puzzles.extend(puzzles)
        
        pbar.update(len(puzzles))  # Update progress bar by the number of puzzles fetched

        if max_pages and page >= max_pages:
            break
        page += 1

    pbar.close()  # Close the progress bar after scraping is done
    return all_puzzles

def store_puzzle_data(puzzles):
    for date, name, solution_url, data_directory, correct_submissions in puzzles:
        # Insert puzzle into puzzles table
        cursor.execute('''
            INSERT INTO puzzles (date, name, solution_url, data_directory)
            VALUES (?, ?, ?, ?)
            ON CONFLICT(date, name) DO UPDATE SET
                solution_url=excluded.solution_url,
                data_directory=excluded.data_directory
        ''', (date, name, solution_url, data_directory))
        
        # Get the puzzle_id from the last inserted or updated row
        cursor.execute('SELECT id FROM puzzles WHERE date = ? AND name = ?', (date, name))
        puzzle_id = cursor.fetchone()[0]

        # Insert or update users and submissions
        if isinstance(correct_submissions, list):
            for user_name in correct_submissions:
                # Normalize user name
                normalized_user_name = user_name.strip().lower()
                
                cursor.execute('''
                    INSERT INTO users (original_name, normalized_name)
                    VALUES (?, ?)
                    ON CONFLICT(normalized_name) DO NOTHING
                ''', (user_name, normalized_user_name))
                
                # Fetch user_id whether inserted or existing
                cursor.execute('SELECT id FROM users WHERE normalized_name = ?', (normalized_user_name,))
                user_id = cursor.fetchone()[0]

                # Insert into submissions table
                cursor.execute('''
                    INSERT INTO submissions (puzzle_id, user_id)
                    VALUES (?, ?)
                ''', (puzzle_id, user_id))

    # Commit all changes
    connection.commit()


# Set your desired number of pages to scrape or None to scrape all
max_pages = None
base_url = 'https://www.janestreet.com/puzzles/archive/'
puzzles = scrape_puzzles(base_url, max_pages)

# Store the results in the database
store_puzzle_data(puzzles)

# Close the database connection
connection.close()

print("Scraping and storing completed successfully.")
