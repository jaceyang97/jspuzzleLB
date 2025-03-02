from datetime import datetime
from stats import JaneStreetLeaderboardStats


def generate_markdown(stats):
    """Generate markdown content for the leaderboard."""
    # Get top solvers for different categories
    top_solvers = sorted(
        stats.solver_stats.items(), key=lambda x: x[1]["total_solved"], reverse=True
    )[:50]

    longest_streaks = sorted(
        stats.solver_stats.items(), key=lambda x: x[1]["max_streak"], reverse=True
    )[:20]

    # Generate markdown content with more engaging language
    md_content = f"""# 🧩 Jane Street Puzzle Leaderboard

## Overview
This leaderboard tracks statistics for solvers of [Jane Street's monthly puzzles](https://www.janestreet.com/puzzles/current-puzzle/).

*Last updated: {datetime.now().strftime('%Y-%m-%d')}*

- **🧩 Puzzles Published**: {len(stats.puzzles)}
- **👥 Unique Solvers**: {stats.total_unique_solvers}

## 🏆 Puzzle-Solving Champions
These solvers have completed the most Jane Street puzzles:

| Rank | Solver | Puzzles Solved | First Appeared | Most Recent Solve |
|------|--------|---------------|-------------|------------|
"""

    for i, (solver, stats_data) in enumerate(top_solvers, 1):
        first_solve = (
            stats_data["first_solve"].strftime("%b %Y")
            if stats_data["first_solve"]
            else "N/A"
        )
        last_solve = (
            stats_data["last_solve"].strftime("%b %Y")
            if stats_data["last_solve"]
            else "N/A"
        )
        md_content += f"| {i} | {solver} | {stats_data['total_solved']} | {first_solve} | {last_solve} |\n"

    md_content += """
## 🔥 Consistency Streaks
These solvers have the longest consecutive monthly solving streaks:

| Rank | Solver | Streak Length | Start | End |
|------|--------|--------------|-------|-----|
"""

    for i, (solver, stats_data) in enumerate(longest_streaks, 1):
        if stats_data["max_streak"] < 2:
            continue

        start = (
            f"{datetime(stats_data['max_streak_start'][0], stats_data['max_streak_start'][1], 1).strftime('%b %Y')}"
            if stats_data["max_streak_start"]
            else "N/A"
        )
        end = (
            f"{datetime(stats_data['max_streak_end'][0], stats_data['max_streak_end'][1], 1).strftime('%b %Y')}"
            if stats_data["max_streak_end"]
            else "N/A"
        )

        md_content += f"| {i} | {solver} | {stats_data['max_streak']} months | {start} | {end} |\n"

    # Add rising stars section if we have any
    if stats.rising_stars:
        md_content += """
## 🌟 Rising Stars
These solvers have started recently (within the past year) but are solving at an impressive rate. The solve rate is calculated by dividing the total number of puzzles solved by the number of months since their first appearance.

| Solver | Puzzles Solved | Solve Rate | First Appearance |
|--------|---------------|------------|------------------|
"""

        for i, star in enumerate(stats.rising_stars, 1):
            first_solve = star["first_solve"].strftime("%b %Y")
            solve_rate = f"{star['solve_rate']:.2f} puzzles/month"

            md_content += f"| {star['solver']} | {star['total_solved']} | {solve_rate} | {first_solve} |\n"

    md_content += """
## 📈 Visualizations

### Monthly Participation
![Monthly Participation](leaderboard_stats/monthly_participation.png)

### Top Solver Activity Matrix
![Solver Activity Matrix](leaderboard_stats/solver_activity_matrix.png)

### Unique Solvers Growth
![Unique Solvers Growth](leaderboard_stats/unique_solvers_growth.png)

## 🛠️ Running Locally
1. Install required dependencies
2. Run `python main.py` to scrape puzzle data (saves to puzzles.json)
3. Run `python markdown.py` to generate this README

## ⚠️ Disclaimer
*Not affiliated with Jane Street. For recreational use only. Users are responsible for proper usage.*
"""

    # Update the main README.md file in the project root
    with open("README.md", "w", encoding="utf-8") as f:
        f.write(md_content)


def main():
    """Generate Jane Street puzzle leaderboard statistics."""
    stats = JaneStreetLeaderboardStats()
    stats.process_all_stats()

    generate_markdown(stats)

    print(f"Leaderboard statistics generated in {stats.output_dir}")


if __name__ == "__main__":
    main()
