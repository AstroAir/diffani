import {
  type AnimationPreset,
  type AnimationPresetConfig,
  type PresetCollection,
  type PresetSearchFilters,
  type PresetSearchResult,
  PresetCategory,
  DEFAULT_PRESETS,
} from './types';

export class PresetManager {
  private presets: Map<string, AnimationPreset> = new Map();
  private collections: Map<string, PresetCollection> = new Map();
  private storageKey = 'diffani-animation-presets';
  private collectionsKey = 'diffani-preset-collections';

  constructor() {
    this.loadFromStorage();
    this.initializeDefaultPresets();
  }

  /**
   * Initialize default presets if none exist
   */
  private initializeDefaultPresets(): void {
    if (this.presets.size === 0) {
      DEFAULT_PRESETS.forEach((presetData, index) => {
        const preset: AnimationPreset = {
          id: `default-${index}`,
          name: presetData.name!,
          description: presetData.description!,
          category: presetData.category!,
          author: 'Diffani Team',
          version: '1.0.0',
          createdAt: new Date(),
          updatedAt: new Date(),
          tags: presetData.tags!,
          config: presetData.config!,
          metadata: {
            downloads: 0,
            rating: 5.0,
            ratingCount: 1,
            featured: true,
            verified: true,
            license: 'MIT' as const,
            compatibility: ['1.0.0'],
            fileSize: 0,
          },
        };
        this.presets.set(preset.id, preset);
      });
      this.saveToStorage();
    }
  }

  /**
   * Save a new preset or update an existing one
   */
  savePreset(
    config: AnimationPresetConfig,
    metadata: {
      name: string;
      description: string;
      category: PresetCategory;
      tags: string[];
      author?: string;
    },
  ): AnimationPreset {
    const preset: AnimationPreset = {
      id: this.generateId(),
      name: metadata.name,
      description: metadata.description,
      category: metadata.category,
      author: metadata.author || 'User',
      version: '1.0.0',
      createdAt: new Date(),
      updatedAt: new Date(),
      tags: metadata.tags,
      config,
      metadata: {
        downloads: 0,
        rating: 0,
        ratingCount: 0,
        featured: false,
        verified: false,
        license: 'MIT' as const,
        compatibility: ['1.0.0'],
        fileSize: JSON.stringify(config).length,
      },
    };

    this.presets.set(preset.id, preset);
    this.saveToStorage();
    return preset;
  }

  /**
   * Load a preset by ID
   */
  loadPreset(id: string): AnimationPreset | null {
    return this.presets.get(id) || null;
  }

  /**
   * Delete a preset
   */
  deletePreset(id: string): boolean {
    const deleted = this.presets.delete(id);
    if (deleted) {
      this.saveToStorage();
    }
    return deleted;
  }

  /**
   * Get all presets
   */
  getAllPresets(): AnimationPreset[] {
    return Array.from(this.presets.values());
  }

  /**
   * Search presets with filters
   */
  searchPresets(
    query?: string,
    filters?: PresetSearchFilters,
    page = 1,
    pageSize = 20,
  ): PresetSearchResult {
    let results = Array.from(this.presets.values());

    // Apply text search
    if (query) {
      const searchTerm = query.toLowerCase();
      results = results.filter(
        (preset) =>
          preset.name.toLowerCase().includes(searchTerm) ||
          preset.description.toLowerCase().includes(searchTerm) ||
          preset.tags.some((tag) => tag.toLowerCase().includes(searchTerm)) ||
          preset.author?.toLowerCase().includes(searchTerm),
      );
    }

    // Apply filters
    if (filters) {
      if (filters.category) {
        results = results.filter(
          (preset) => preset.category === filters.category,
        );
      }
      if (filters.tags && filters.tags.length > 0) {
        results = results.filter((preset) =>
          filters.tags!.some((tag) => preset.tags.includes(tag)),
        );
      }
      if (filters.author) {
        results = results.filter((preset) => preset.author === filters.author);
      }
      if (filters.minRating) {
        results = results.filter(
          (preset) => preset.metadata.rating >= filters.minRating!,
        );
      }
      if (filters.license) {
        results = results.filter(
          (preset) => preset.metadata.license === filters.license,
        );
      }
      if (filters.featured !== undefined) {
        results = results.filter(
          (preset) => preset.metadata.featured === filters.featured,
        );
      }
      if (filters.verified !== undefined) {
        results = results.filter(
          (preset) => preset.metadata.verified === filters.verified,
        );
      }
    }

    // Sort by rating and featured status
    results.sort((a, b) => {
      if (a.metadata.featured && !b.metadata.featured) return -1;
      if (!a.metadata.featured && b.metadata.featured) return 1;
      return b.metadata.rating - a.metadata.rating;
    });

    // Pagination
    const totalCount = results.length;
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const paginatedResults = results.slice(startIndex, endIndex);

    return {
      presets: paginatedResults,
      totalCount,
      page,
      pageSize,
      hasMore: endIndex < totalCount,
    };
  }

  /**
   * Create a new collection
   */
  createCollection(
    name: string,
    description: string,
    presetIds: string[],
  ): PresetCollection {
    const collection: PresetCollection = {
      id: this.generateId(),
      name,
      description,
      presets: presetIds,
      author: 'User',
      public: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.collections.set(collection.id, collection);
    this.saveCollectionsToStorage();
    return collection;
  }

  /**
   * Get all collections
   */
  getAllCollections(): PresetCollection[] {
    return Array.from(this.collections.values());
  }

  /**
   * Export preset to JSON
   */
  exportPreset(id: string): string | null {
    const preset = this.presets.get(id);
    if (!preset) return null;
    return JSON.stringify(preset, null, 2);
  }

  /**
   * Import preset from JSON
   */
  importPreset(jsonData: string): AnimationPreset | null {
    try {
      const preset = JSON.parse(jsonData) as AnimationPreset;

      // Validate preset structure
      if (!this.validatePreset(preset)) {
        throw new Error('Invalid preset format');
      }

      // Generate new ID to avoid conflicts
      preset.id = this.generateId();
      preset.updatedAt = new Date();

      this.presets.set(preset.id, preset);
      this.saveToStorage();
      return preset;
    } catch (error) {
      console.error('Failed to import preset:', error);
      return null;
    }
  }

  /**
   * Duplicate a preset
   */
  duplicatePreset(id: string, newName?: string): AnimationPreset | null {
    const original = this.presets.get(id);
    if (!original) return null;

    const duplicate: AnimationPreset = {
      ...original,
      id: this.generateId(),
      name: newName || `${original.name} (Copy)`,
      createdAt: new Date(),
      updatedAt: new Date(),
      metadata: {
        ...original.metadata,
        downloads: 0,
        rating: 0,
        ratingCount: 0,
        featured: false,
      },
    };

    this.presets.set(duplicate.id, duplicate);
    this.saveToStorage();
    return duplicate;
  }

  /**
   * Update preset metadata (rating, downloads, etc.)
   */
  updatePresetMetadata(
    id: string,
    updates: Partial<AnimationPreset['metadata']>,
  ): boolean {
    const preset = this.presets.get(id);
    if (!preset) return false;

    preset.metadata = { ...preset.metadata, ...updates };
    preset.updatedAt = new Date();
    this.saveToStorage();
    return true;
  }

  /**
   * Get presets by category
   */
  getPresetsByCategory(category: PresetCategory): AnimationPreset[] {
    return Array.from(this.presets.values()).filter(
      (preset) => preset.category === category,
    );
  }

  /**
   * Get featured presets
   */
  getFeaturedPresets(): AnimationPreset[] {
    return Array.from(this.presets.values())
      .filter((preset) => preset.metadata.featured)
      .sort((a, b) => b.metadata.rating - a.metadata.rating);
  }

  /**
   * Validate preset structure
   */
  private validatePreset(preset: unknown): preset is AnimationPreset {
    return (
      preset &&
      typeof preset.id === 'string' &&
      typeof preset.name === 'string' &&
      typeof preset.description === 'string' &&
      preset.config &&
      preset.metadata
    );
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `preset-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Save presets to localStorage
   */
  private saveToStorage(): void {
    try {
      const data = Array.from(this.presets.entries());
      localStorage.setItem(this.storageKey, JSON.stringify(data));
    } catch (error) {
      console.error('Failed to save presets to storage:', error);
    }
  }

  /**
   * Load presets from localStorage
   */
  private loadFromStorage(): void {
    try {
      const data = localStorage.getItem(this.storageKey);
      if (data) {
        const entries = JSON.parse(data) as [string, AnimationPreset][];
        this.presets = new Map(entries);
      }
    } catch (error) {
      console.error('Failed to load presets from storage:', error);
    }
  }

  /**
   * Save collections to localStorage
   */
  private saveCollectionsToStorage(): void {
    try {
      const data = Array.from(this.collections.entries());
      localStorage.setItem(this.collectionsKey, JSON.stringify(data));
    } catch (error) {
      console.error('Failed to save collections to storage:', error);
    }
  }

  /**
   * Load collections from localStorage
   */
  private loadCollectionsFromStorage(): void {
    try {
      const data = localStorage.getItem(this.collectionsKey);
      if (data) {
        const entries = JSON.parse(data) as [string, PresetCollection][];
        this.collections = new Map(entries);
      }
    } catch (error) {
      console.error('Failed to load collections from storage:', error);
    }
  }
}
