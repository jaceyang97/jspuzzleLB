import json
import os
from datetime import datetime
from collections import defaultdict
import matplotlib.pyplot as plt
import numpy as np
from typing import List, Dict, Any, Tuple
from pathlib import Path


class JaneStreetLeaderboardStats:
    """Process Jane Street puzzle data and generate engaging statistics for GitHub display."""

    def __init__(self, data_file: str = "puzzles.json"):
        """Initialize with path to the puzzles data file."""
        self.data_file = data_file
        self.puzzles = self._load_data()
        self.solver_stats = {}
        self.puzzle_stats = {}
        self.rising_stars = []
        self.output_dir = Path("leaderboard_stats")
        self.output_dir.mkdir(exist_ok=True)

    def _load_data(self) -> List[Dict[str, Any]]:
        """Load puzzle data from JSON file."""
        if not os.path.exists(self.data_file):
            raise FileNotFoundError(f"Data file not found: {self.data_file}")

        with open(self.data_file, "r") as f:
            puzzles = json.load(f)

        # Convert date_text strings to datetime objects for easier processing
        for puzzle in puzzles:
            if "date_text" in puzzle:
                try:
                    puzzle["date"] = datetime.strptime(puzzle["date_text"], "%B %Y")
                except ValueError:
                    # Handle any date parsing errors
                    puzzle["date"] = None

        return puzzles

    def process_all_stats(self):
        """Process all statistics at once."""
        self._calculate_solver_stats()
        self._calculate_puzzle_stats()
        self._identify_rising_stars()
        self._generate_all_visualizations()
        # Markdown generation moved to separate file

    def _calculate_solver_stats(self):
        """Calculate statistics for each solver."""
        solver_puzzles = defaultdict(list)
        solver_dates = defaultdict(list)

        # Count puzzles solved by each person
        for puzzle in self.puzzles:
            if not puzzle.get("solvers"):
                continue

            for solver in puzzle["solvers"]:
                solver_puzzles[solver].append(puzzle["name"])
                if puzzle.get("date"):
                    solver_dates[solver].append(puzzle["date"])

        # Calculate stats for each solver
        for solver, puzzles in solver_puzzles.items():
            dates = solver_dates[solver]

            # Skip solvers with no valid dates
            if not dates:
                continue

            first_solve = min(dates)
            last_solve = max(dates)
            active_months = len(set((d.year, d.month) for d in dates))

            # Calculate streak information
            dates_sorted = sorted(set((d.year, d.month) for d in dates))
            current_streak = 0
            max_streak = 0
            current_streak_start = None
            max_streak_start = None
            max_streak_end = None

            if dates_sorted:
                prev_date = None
                streak_start = dates_sorted[0]

                for date in dates_sorted:
                    if prev_date is None:
                        current_streak = 1
                    elif self._is_consecutive_month(prev_date, date):
                        current_streak += 1
                    else:
                        if current_streak > max_streak:
                            max_streak = current_streak
                            max_streak_start = streak_start
                            max_streak_end = prev_date
                        current_streak = 1
                        streak_start = date

                    prev_date = date

                # Check final streak
                if current_streak > max_streak:
                    max_streak = current_streak
                    max_streak_start = streak_start
                    max_streak_end = prev_date

            self.solver_stats[solver] = {
                "total_solved": len(puzzles),
                "first_solve": first_solve,
                "last_solve": last_solve,
                "active_months": active_months,
                "max_streak": max_streak,
                "max_streak_start": max_streak_start,
                "max_streak_end": max_streak_end,
                "puzzles": puzzles,
            }

        # Calculate overall unique solvers count
        all_solvers = set()
        for puzzle in self.puzzles:
            if "solvers" in puzzle:
                all_solvers.update(puzzle["solvers"])

        self.total_unique_solvers = len(all_solvers)

    def _is_consecutive_month(
        self, date1: Tuple[int, int], date2: Tuple[int, int]
    ) -> bool:
        """Check if two (year, month) tuples are consecutive months."""
        year1, month1 = date1
        year2, month2 = date2

        # Next month
        if year1 == year2 and month2 == month1 + 1:
            return True
        # January of next year
        if year2 == year1 + 1 and month1 == 12 and month2 == 1:
            return True
        return False

    def _calculate_puzzle_stats(self):
        """Calculate statistics for each puzzle."""
        for puzzle in self.puzzles:
            if not puzzle.get("name") or not puzzle.get("date"):
                continue

            solvers = puzzle.get("solvers", [])

            self.puzzle_stats[puzzle["name"]] = {
                "date": puzzle["date"],
                "solver_count": len(solvers),
                "solvers": solvers,
                "solution_url": puzzle.get("solution_url", ""),
            }

    def _identify_rising_stars(self, recent_months: int = 12, min_puzzles: int = 3):
        """Identify rising stars - solvers who started recently but are performing well."""
        # Get current date for comparison
        now = datetime.now()
        cutoff_date = datetime(now.year - 1, now.month, 1)  # One year ago

        # Find solvers who started within the cutoff period
        recent_starters = []
        for solver, stats in self.solver_stats.items():
            if (
                stats["first_solve"] >= cutoff_date
                and stats["total_solved"] >= min_puzzles
            ):
                # Calculate solve rate (puzzles per month)
                months_active = (
                    (stats["last_solve"].year - stats["first_solve"].year) * 12
                    + (stats["last_solve"].month - stats["first_solve"].month)
                    + 1
                )
                solve_rate = stats["total_solved"] / months_active

                recent_starters.append(
                    {
                        "solver": solver,
                        "first_solve": stats["first_solve"],
                        "total_solved": stats["total_solved"],
                        "months_active": months_active,
                        "solve_rate": solve_rate,
                    }
                )

        # Sort by solve rate
        self.rising_stars = sorted(
            recent_starters, key=lambda x: x["solve_rate"], reverse=True
        )[:10]

    def _plot_monthly_participation(self, recent_months: int = 36):
        """Plot the number of participants per month over time."""
        # Group puzzles by month
        monthly_solvers = defaultdict(set)

        for puzzle in self.puzzles:
            if not puzzle.get("date") or not puzzle.get("solvers"):
                continue

            month_key = (puzzle["date"].year, puzzle["date"].month)
            monthly_solvers[month_key].update(puzzle["solvers"])

        # Sort by date and take the most recent months
        sorted_months = sorted(monthly_solvers.items())[-recent_months:]

        # Prepare data for plotting
        months = [f"{month}-{year}" for (year, month) in [m[0] for m in sorted_months]]
        participants = [len(solvers) for _, solvers in sorted_months]

        # Create the plot with a modern style
        plt.figure(figsize=(14, 8))
        plt.style.use("seaborn-v0_8-whitegrid")  # Clean, professional style

        # Create a gradient color for the line and area
        main_color = "#3498db"  # Professional blue

        # Plot the line with a subtle area fill
        ax = plt.subplot(111)
        ax.plot(
            months,
            participants,
            marker="o",
            linestyle="-",
            linewidth=2.5,
            color=main_color,
            markerfacecolor="white",
            markeredgecolor=main_color,
            markeredgewidth=2,
            markersize=8,
        )

        # Add subtle area fill below the line
        ax.fill_between(months, participants, alpha=0.15, color=main_color)

        # Add the actual number above each data point with improved styling
        for i, count in enumerate(participants):
            ax.annotate(
                f"{count}",
                (months[i], participants[i]),
                textcoords="offset points",
                xytext=(0, 12),
                ha="center",
                fontsize=10,
                fontweight="bold",
                color="#2c3e50",  # Dark blue-gray for text
            )

        # Customize the grid and spines
        ax.grid(True, linestyle="--", alpha=0.3, color="#bdc3c7")
        for spine in ax.spines.values():
            spine.set_visible(False)

        # Improve axis labels and title
        plt.xlabel("Month", fontsize=12, fontweight="bold", labelpad=15)
        plt.ylabel(
            "Number of Participants", fontsize=12, fontweight="bold", labelpad=15
        )
        plt.title(
            "Monthly Participation in Jane Street Puzzles",
            fontsize=16,
            fontweight="bold",
            pad=20,
            color="#2c3e50",
        )

        # Improve tick labels
        plt.xticks(rotation=45, ha="right", fontsize=10)
        plt.yticks(fontsize=10)

        # Add subtle horizontal lines at y-axis tick positions
        ax.yaxis.grid(True, linestyle="-", alpha=0.1, color="#7f8c8d")

        # Ensure adequate spacing
        plt.tight_layout()

        # Save with high resolution
        plt.savefig(
            self.output_dir / "monthly_participation.png",
            dpi=300,
            bbox_inches="tight",
            facecolor="white",
        )
        plt.close()

    def _plot_solver_activity_heatmap(self, top_n: int = 15):
        """Create a visualization showing when top solvers were active."""
        # Get top solvers
        top_solvers = sorted(
            self.solver_stats.items(),
            key=lambda x: x[1]["total_solved"],
            reverse=True,
        )[:top_n]

        # Extract solver names and their monthly activity
        solver_names = [solver[0] for solver in top_solvers]

        # Get all months from puzzles
        all_months = []
        for puzzle in self.puzzles:
            if "date" in puzzle and puzzle["date"]:
                month_key = (puzzle["date"].year, puzzle["date"].month)
                all_months.append(month_key)

        # Get unique months and sort them
        unique_months = sorted(set(all_months))
        months = [f"{month}-{year}" for (year, month) in unique_months]

        # Create activity matrix
        activity_matrix = np.zeros((len(solver_names), len(months)))

        # Fill the activity matrix
        for i, solver in enumerate(solver_names):
            for j, month_key in enumerate(unique_months):
                # Count puzzles solved by this solver in this month
                count = 0
                for puzzle in self.puzzles:
                    if "date" in puzzle and puzzle["date"]:
                        puzzle_month = (puzzle["date"].year, puzzle["date"].month)
                        if puzzle_month == month_key and solver in puzzle.get(
                            "solvers", []
                        ):
                            count += 1
                activity_matrix[i, j] = count

        # Create a professional-looking figure
        plt.figure(figsize=(14, 10))
        plt.style.use("seaborn-v0_8-whitegrid")

        # Plot the binary activity matrix (solved/not solved)
        ax = plt.subplot(111)

        # Convert to binary activity (solved or not solved)
        binary_matrix = (activity_matrix > 0).astype(int)

        # Flip the matrix vertically to display top solvers at the top
        binary_matrix = np.flipud(binary_matrix)
        # Also flip the solver_names list to maintain correct mapping
        solver_names = solver_names[::-1]

        # Define specific colors for better clarity
        not_solved_color = "#f0f0f0"  # Light gray for not solved
        solved_color = "#3498db"  # Professional blue for solved

        # Create a custom colormap with exactly these two colors
        from matplotlib.colors import ListedColormap

        custom_cmap = ListedColormap([not_solved_color, solved_color])

        # Plot with the custom colormap
        heatmap = ax.pcolormesh(
            binary_matrix,
            cmap=custom_cmap,
            edgecolors="white",
            linewidth=0.01,
            vmin=0,
            vmax=1,
        )

        # Set axis labels and title with improved styling
        plt.xlabel("Month", fontsize=12, fontweight="bold", labelpad=15)
        plt.ylabel("Solver", fontsize=12, fontweight="bold", labelpad=15)
        plt.title(
            "Puzzle Solving Activity of Top Solvers",
            fontsize=16,
            fontweight="bold",
            pad=20,
            color="#2c3e50",
        )

        # Improve x-axis tick labels - show only every 3 months to avoid crowding
        x_ticks_positions = np.arange(0, len(months), 3) + 0.5
        x_ticks_labels = [months[i] for i in range(0, len(months), 3)]

        plt.xticks(
            x_ticks_positions, x_ticks_labels, rotation=45, ha="right", fontsize=10
        )

        # Improve y-axis tick labels - now correctly ordered from top to bottom
        plt.yticks(
            np.arange(len(solver_names)) + 0.5,
            [
                f"{name} ({self.solver_stats[name]['total_solved']})"
                for name in solver_names
            ],
            fontsize=10,
        )

        # Remove unnecessary spines
        for spine in ax.spines.values():
            spine.set_visible(False)

        # Add a legend with matching colors
        from matplotlib.patches import Patch

        legend_elements = [
            Patch(facecolor=not_solved_color, edgecolor="gray", label="Not Solved"),
            Patch(facecolor=solved_color, edgecolor="gray", label="Solved"),
        ]
        ax.legend(handles=legend_elements, loc="upper right", frameon=True)

        # Ensure adequate spacing
        plt.tight_layout()

        # Save with high resolution
        plt.savefig(
            self.output_dir / "solver_activity_matrix.png",
            dpi=300,
            bbox_inches="tight",
            facecolor="white",
        )
        plt.close()

    def _plot_unique_solvers_over_time(self):
        """Plot the cumulative number of unique solvers over time."""
        # Sort puzzles by date
        sorted_puzzles = sorted(
            [p for p in self.puzzles if "date" in p and p["date"]],
            key=lambda x: x["date"],
        )

        # Track unique solvers over time
        unique_solvers = set()
        dates = []
        solver_counts = []

        for puzzle in sorted_puzzles:
            if "solvers" in puzzle:
                unique_solvers.update(puzzle["solvers"])
                dates.append(puzzle["date"])
                solver_counts.append(len(unique_solvers))

        # Create the plot with a modern style
        plt.figure(figsize=(14, 8))
        plt.style.use("seaborn-v0_8-whitegrid")

        # Create a gradient color for the line and area
        main_color = "#2ecc71"  # Professional green

        # Plot the line with a subtle area fill
        ax = plt.subplot(111)
        ax.plot(
            dates,
            solver_counts,
            marker="o",
            linestyle="-",
            linewidth=2.5,
            color=main_color,
            markerfacecolor="white",
            markeredgecolor=main_color,
            markeredgewidth=2,
            markersize=8,
        )

        # Add subtle area fill below the line
        ax.fill_between(dates, solver_counts, alpha=0.15, color=main_color)

        # Add the actual number above selected data points (every 5th point to avoid crowding)
        for i in range(0, len(dates), 5):
            ax.annotate(
                f"{solver_counts[i]}",
                (dates[i], solver_counts[i]),
                textcoords="offset points",
                xytext=(0, 12),
                ha="center",
                fontsize=10,
                fontweight="bold",
                color="#2c3e50",
            )

        # Add the final count
        ax.annotate(
            f"{solver_counts[-1]}",
            (dates[-1], solver_counts[-1]),
            textcoords="offset points",
            xytext=(0, 12),
            ha="center",
            fontsize=10,
            fontweight="bold",
            color="#2c3e50",
        )

        # Customize the grid and spines
        ax.grid(True, linestyle="--", alpha=0.3, color="#bdc3c7")
        for spine in ax.spines.values():
            spine.set_visible(False)

        # Improve axis labels and title
        plt.xlabel("Date", fontsize=12, fontweight="bold", labelpad=15)
        plt.ylabel(
            "Cumulative Unique Solvers", fontsize=12, fontweight="bold", labelpad=15
        )
        plt.title(
            "Growth of Unique Puzzle Solvers Over Time",
            fontsize=16,
            fontweight="bold",
            pad=20,
            color="#2c3e50",
        )

        # Format the x-axis dates
        plt.gcf().autofmt_xdate()

        # Add subtle horizontal lines at y-axis tick positions
        ax.yaxis.grid(True, linestyle="-", alpha=0.1, color="#7f8c8d")

        # Ensure adequate spacing
        plt.tight_layout()

        # Save with high resolution
        plt.savefig(
            self.output_dir / "unique_solvers_growth.png",
            dpi=300,
            bbox_inches="tight",
            facecolor="white",
        )
        plt.close()

    def _generate_all_visualizations(self):
        """Generate all visualizations for the leaderboard."""
        self._plot_monthly_participation()
        self._plot_solver_activity_heatmap()
        self._plot_unique_solvers_over_time()
        # Rising stars plot is no longer generated
