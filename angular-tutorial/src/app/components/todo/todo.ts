import { Component, signal, computed, effect, OnInit, OnDestroy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

type Priority = 'low' | 'medium' | 'high';
type FilterType = 'all' | 'active' | 'completed' | 'expired';
type SortType = 'created' | 'expiry' | 'priority';

interface Task {
  id: number;
  task: string;
  priority: Priority;
  category: string;
  createdAt: Date;
  expiresAt: Date;
  isComplete: boolean;
  isExpired: boolean;
  timeRemaining: string;
}

@Component({
  selector: 'app-todo',
  templateUrl: './todo.html',
  standalone: true,
  imports: [FormsModule, CommonModule],
  styleUrl: './todo.css',
})
export class Todo implements OnInit, OnDestroy {
  // =====================
  // CONSTANTS
  // =====================
  private readonly STORAGE_KEY = 'taskMasterPro_tasks';

  // =====================
  // FORM STATE (MODERNIZED WITH SIGNALS)
  // =====================
  newTask = signal<string>('');
  newTaskPriority = signal<Priority>('medium');
  newTaskCategory = signal<string>('Personal');
  expiryHours = signal<number>(24);

  // =====================
  // SIGNAL STATE
  // =====================
  tasks = signal<Task[]>([]);
  filterType = signal<FilterType>('all');
  searchQuery = signal<string>('');
  sortBy = signal<SortType>('created');

  // Timer management
  private timerIntervalId: number | null = null;

  // =====================
  // COMPUTED VALUES
  // =====================
  filteredTasks = computed(() => {
    let list = [...this.tasks()];

    // Filter
    if (this.filterType() === 'active') {
      list = list.filter((t) => !t.isComplete && !t.isExpired);
    } else if (this.filterType() === 'completed') {
      list = list.filter((t) => t.isComplete);
    } else if (this.filterType() === 'expired') {
      list = list.filter((t) => t.isExpired);
    }

    // Search
    const query = this.searchQuery().toLowerCase();
    if (query) {
      list = list.filter(
        (t) =>
          t.task.toLowerCase().includes(query) ||
          t.category.toLowerCase().includes(query)
      );
    }

    // Sort
    switch (this.sortBy()) {
      case 'expiry':
        list.sort((a, b) => a.expiresAt.getTime() - b.expiresAt.getTime());
        break;
      case 'priority':
        const priorityOrder = { high: 1, medium: 2, low: 3 };
        list.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
        break;
      default:
        list.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    }

    return list;
  });

  completedCount = computed(() => this.tasks().filter((t) => t.isComplete).length);
  pendingCount = computed(() => this.tasks().filter((t) => !t.isComplete && !t.isExpired).length);
  expiredCount = computed(() => this.tasks().filter((t) => t.isExpired).length);

  // =====================
  // TASK ACTIONS
  // =====================
  addTask() {
    const taskText = this.newTask().trim();
    if (!taskText) return;

    const now = new Date();
    const expiresAt = new Date(now.getTime() + this.expiryHours() * 60 * 60 * 1000);

    const task: Task = {
      id: Date.now(),
      task: taskText,
      priority: this.newTaskPriority(),
      category: this.newTaskCategory(),
      createdAt: now,
      expiresAt,
      isComplete: false,
      isExpired: false,
      timeRemaining: '',
    };

    this.tasks.update((tasks) => [...tasks, task]);
    this.newTask.set('');
    this.saveTasks();
  }

  completeTask(id: number) {
    this.tasks.update((tasks) =>
      tasks.map((t) => (t.id === id ? { ...t, isComplete: !t.isComplete } : t))
    );
    this.saveTasks();
  }

  deleteTask(id: number) {
    this.tasks.update((tasks) => tasks.filter((t) => t.id !== id));
    this.saveTasks();
  }

  deleteCompleted() {
    this.tasks.update((tasks) => tasks.filter((t) => !t.isComplete));
    this.saveTasks();
  }

  clearAll() {
    this.tasks.set([]);
    this.saveTasks();
  }

  // =====================
  // HELPERS
  // =====================
  getFormattedDate(date: Date): string {
    return date.toLocaleString();
  }

  getPriorityColor(priority: string): string {
    switch (priority) {
      case 'high':
        return 'from-red-500 to-orange-500';
      case 'medium':
        return 'from-yellow-400 to-yellow-600';
      default:
        return 'from-green-400 to-green-600';
    }
  }

  getPriorityIcon(priority: string): string {
    switch (priority) {
      case 'high':
        return '🔴';
      case 'medium':
        return '🟡';
      default:
        return '🟢';
    }
  }

  // =====================
  // LIFECYCLE HOOKS
  // =====================
  ngOnInit() {
    // Load tasks from localStorage
    this.loadTasks();

    // Update task expiry every minute
    this.timerIntervalId = window.setInterval(() => {
      this.updateTaskExpiry();
    }, 60_000);

    // Update immediately on init
    this.updateTaskExpiry();
  }

  ngOnDestroy() {
    // Clean up interval on component destroy
    if (this.timerIntervalId !== null) {
      clearInterval(this.timerIntervalId);
    }
  }

  // =====================
  // LOCALSTORAGE METHODS
  // =====================
  private saveTasks(): void {
    try {
      // Convert Date objects to ISO strings for storage
      const tasksToStore = this.tasks().map((task) => ({
        ...task,
        createdAt: task.createdAt.toISOString(),
        expiresAt: task.expiresAt.toISOString(),
      }));
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(tasksToStore));
    } catch (error) {
      console.error('Error saving tasks to localStorage:', error);
    }
  }

  private loadTasks(): void {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        // Convert ISO strings back to Date objects
        const parsed = JSON.parse(stored);
        const tasksLoaded = parsed.map((task: any) => ({
          ...task,
          createdAt: new Date(task.createdAt),
          expiresAt: new Date(task.expiresAt),
        }));
        this.tasks.set(tasksLoaded);
      }
    } catch (error) {
      console.error('Error loading tasks from localStorage:', error);
      this.tasks.set([]);
    }
  }

  // =====================
  // PRIVATE METHODS
  // =====================
  private updateTaskExpiry(): void {
    const now = new Date().getTime();
    this.tasks.update((tasks) =>
      tasks.map((task) => {
        const diff = task.expiresAt.getTime() - now;
        if (diff <= 0) {
          return { ...task, isExpired: true, timeRemaining: 'Expired' };
        }
        const hours = Math.floor(diff / 1000 / 60 / 60);
        const minutes = Math.floor((diff / 1000 / 60) % 60);
        return { ...task, timeRemaining: `${hours}h ${minutes}m` };
      })
    );
  }
}
