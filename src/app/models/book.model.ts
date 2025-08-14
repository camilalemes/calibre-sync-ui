export interface Book {
  id: number;
  title: string;
  authors: string[];
  formats: string[];
  size?: number;
  last_modified?: number;
  path?: string;
  formatted_size?: string;
}

export interface BookCollection {
  books: Book[];
  total: number;
}

export interface BookMetadata {
  id: number;
  title: string;
  authors: string[];
  publisher?: string;
  published?: string;
  isbn?: string;
  tags?: string[];
  rating?: number;
  comments?: string;
  series?: string;
  series_index?: number;
  language?: string;
}

export interface SyncStats {
  added: number;
  updated: number;
  deleted: number;
  unchanged: number;
  ignored: number;
  errors: number;
  // File details
  added_files?: string[];
  updated_files?: string[];
  deleted_files?: string[];
  ignored_files?: string[];
  error_files?: string[];
}

export interface SyncResult {
  [replicaPath: string]: SyncStats | { error: string };
}

export interface SyncStatusResponse {
  status: 'started' | 'already_running' | 'idle' | 'in_progress';
  last_sync?: string;
  details?: {
    result?: SyncResult;
    errors?: string;
  };
}

export interface SyncStatus {
  status: 'idle' | 'running' | 'completed' | 'error';
  message?: string;
  progress?: number;
  files_processed?: number;
  total_files?: number;
  result?: SyncResult;
  last_sync?: string;
  errors?: string;
}

export interface AddBookRequest {
  title: string;
  authors: string[];
  publisher?: string;
  published?: string;
  isbn?: string;
  language?: string;
  series?: string;
  series_index?: number;
  comments?: string;
  file: File;
}

export interface ComparisonReplicaResult {
  name: string;
  path: string;
  unique_to_main_library: number;
  unique_to_replica: number;
  unique_to_main_library_books?: Book[];
  unique_to_replica_books?: Book[];
  status: 'success' | 'error';
  error?: string;
  note?: string;
  total_calibre_books?: number;
  total_replica_books?: number;
  common_books?: number;
}

export interface ComparisonResult {
  current_library_path: string;
  replicas: ComparisonReplicaResult[];
}

// API Response types
export interface ApiResponse<T> {
  data: T;
  message?: string;
  timestamp?: string;
}

export interface ApiError {
  error: string;
  message: string;
  details?: string;
  timestamp?: string;
  status?: number;
}

export interface AddBookResponse {
  id: number;
  title: string;
  authors: string[];
  message: string;
}

export interface DeleteBookResponse {
  message: string;
  deleted_id: number;
}