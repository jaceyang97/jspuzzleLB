import requests
from bs4 import BeautifulSoup
from datetime import datetime
import re
from collections import Counter
import matplotlib.pyplot as plt

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
            correct_submissions = None
            solution_url = "Solution URL not available"

        puzzles.append((date_text, name, solution_url, correct_submissions))

    return puzzles

def scrape_puzzles(base_url, max_pages=None):
    all_puzzles = []
    page = 1
    while True:
        page_url = f"{base_url}page{page}/index.html" if page > 1 else f"{base_url}index.html"
        puzzles = fetch_puzzles(page_url)
        if not puzzles:
            break
        all_puzzles.extend(puzzles)
        if max_pages and page >= max_pages:
            break
        page += 1
    
    return all_puzzles

def count_user_submissions(all_puzzles):
    all_names = []
    for _, _, _, names in all_puzzles:
        if isinstance(names, list):
            all_names.extend(names)
    
    return Counter(all_names)

# Set your desired number of pages to scrape or None to scrape all
max_pages = None
base_url = 'https://www.janestreet.com/puzzles/archive/'
puzzles = scrape_puzzles(base_url, max_pages)

# Print the results
for puzzle in puzzles:
    print(puzzle)

# Count submissions
submission_counts = count_user_submissions(puzzles)

# 1. Top 50 names with the count
print("\nTop 50 names with their counts:")
for name, count in submission_counts.most_common(50):
    print(f"{name}: {count}")

# 2. Number of unique names
unique_names_count = len(submission_counts)
print(f"\nNumber of unique names: {unique_names_count}")

# 3. Counter frequency distribution graph
# Prepare data for plotting
name_counts = list(submission_counts.values())

plt.figure(figsize=(10, 6))
plt.hist(name_counts, bins=range(1, max(name_counts) + 2), edgecolor='black')
plt.title('Frequency Distribution of Submission Counts')
plt.xlabel('Number of Submissions')
plt.ylabel('Frequency')
plt.xticks(range(1, max(name_counts) + 1))
plt.grid(axis='y', linestyle='--', alpha=0.7)
plt.show()
