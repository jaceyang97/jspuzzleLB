# 🧩Jane Street Puzzle Leaderboard

This program is designed to scrape and analyze the correct puzzle submissions from the [Jane Street Puzzles](https://www.janestreet.com/puzzles/) Archive. It provides insights into the most frequent solvers and visualizes the distribution of submission counts.

## 📊 Current Stats (as of December 5, 2024)
### Number of Unique Puzzle Solvers: 8992
### 🏆 Top 50 Solvers
| Rank | Name                                | Counts |
|------|-------------------------------------|--------|
| 1    | Calvin Pozderac                     | 64     |
| 2    | Senthil Rajasekaran                 | 61     |
| 3    | Karl Mahlburg                       | 55     |
| 4    | Sean Egan                           | 51     |
| 5    | Keith Schneider                     | 49     |
| 6    | Aaditya Raghavan                    | 45     |
| 7    | Gareth Owen                         | 42     |
| 8    | Lazar Ilic                          | 40     |
| 9    | Heidi Stockton                      | 39     |
| 10   | Sébastien Geeraert                  | 38     |
| 11   | Evan Semet                          | 37     |
| 12   | Cubist                              | 31     |
| 13   | Michael DeLyser                     | 30     |
| 14   | Sanandan Swaminathan                | 29     |
| 14   | Hutama                              | 29     |
| 16   | Guillermo Wildschut                 | 26     |
| 17   | Miguel Barbosa Pereira              | 24     |
| 17   | fekstr                              | 24     |
| 17   | Wula                                | 24     |
| 17   | Ian Sleightholme                    | 24     |
| 21   | Will Christerson                    | 23     |
| 21   | Alexander Dineen                    | 23     |
| 21   | Vinay Kameswaran, Shawn Ng, Dave Cox| 23     |
| 21   | Dylan Peifer                        | 23     |
| 25   | Kilian B.                           | 22     |
| 25   | Scott Okuno                         | 22     |
| 25   | Sandip Ghoshal                      | 22     |
| 25   | Sébastien G                         | 22     |
| 29   | Stephen Emet                        | 21     |
| 30   | Tomek Bialach                       | 20     |
| 30   | Stranger                            | 20     |
| 30   | Dimas Ramos                         | 20     |
| 33   | Ben Reiniger                        | 19     |
| 33   | Nick Liu                            | 19     |
| 33   | Iron_Forge                          | 19     |
| 33   | Gwennie Gilbert-Snyder              | 19     |
| 33   | Christopher Wiriawan                | 19     |
| 38   | Arthur Bright                       | 18     |
| 38   | Danica Xiong                        | 18     |
| 38   | Josh Richman                        | 18     |
| 38   | Anton 3 Terekhov                    | 18     |
| 38   | Dan Taylor                          | 18     |
| 38   | Andrew Sultana                      | 18     |
| 38   | Benjamin Lui                        | 18     |
| 38   | Glauber Guarinello                  | 18     |
| 46   | Vincent                             | 17     |
| 46   | Blaine Hill                         | 17     |
| 46   | Christopher Kei                     | 17     |
| 46   | Samer Kadih                         | 17     |
| 46   | Jonathan Kariv                      | 17     |
## ✨Features

### Scrape Submissions
Automatically fetch and process puzzle submissions.
  - **Set Page Limits:** Specify the number of pages to scrape, or leave it unset to scrape all available pages.
  - **Current Month Not Applicable:** Even though Jane Street posts the current month's solver, since it is continuously updated throughout the month and has not been shown on the solution page, the current month's correct submissions will only be counted at the beginning of the next month's puzzle when the solution is revealed.
  - **Older Puzzles Limitation:** No public submissions list exists before November 2015; submissions from before this date are not counted, affecting roughly 22 months/puzzles dating back to January 2014.

### Unique Names
Count the number of unique solvers.
  - **Counting Rule 1:** Treats each "name plate" as a whole. Multiple names listed together are counted as one group of solvers.
  - **Counting Rule 2:** The counting is not case-sensitive; variations in capitalization are considered the same solver (e.g., "XD" vs. "xd").

### Top K Solvers
List the top k solvers with their submission counts.

### Data Visualization
Display submission frequencies using a histogram.

## ⚠️*WORK IN PROGRESS NOTICE*
 
- For a one-time analytical script, just run ```python main.py```. No databases, no nothing, just a plain simple script.
- The rest of the modules are initial steps toward building a web-hosted service. Might come some day.

## 🛡️Legal Disclaimer
This project is not affiliated with or endorsed by Jane Street. Data accessed through this script is used for clout purposes only.

By using this script, you agree to use it responsibly. The developers are not liable for misuse. If the script violates Jane Street's terms of service, corrective action will be taken immediately.

---
*This documentation was partially generated using ChatGPT.*