/**
 * MCP 2025-06-18 completion utilities for argument suggestions
 * Provides contextual suggestions for prompt and resource arguments
 */

export interface CompletionRequest {
  /** Reference to the prompt or resource */
  ref: {
    type: 'prompt' | 'resource';
    name: string;
  };
  /** Argument being completed */
  argument: {
    name: string;
    value: string;
  };
  /** Previous arguments in the context */
  context?: Array<{
    name: string;
    value: string;
  }>;
}

export interface CompletionSuggestion {
  /** The suggested value */
  value: string;
  /** Human-readable label for the suggestion */
  label?: string;
  /** Additional context or description */
  description?: string;
  /** Relevance score (0-100, higher is more relevant) */
  score?: number;
}

export interface CompletionResponse {
  /** Array of suggestions, sorted by relevance */
  suggestions: CompletionSuggestion[];
}

export interface CompletionConfig {
  /** Maximum number of suggestions to return */
  maxSuggestions: number;
  /** Rate limit per second */
  rateLimitPerSecond: number;
  /** Enable fuzzy matching */
  enableFuzzyMatching: boolean;
}

/**
 * Completion service for MCP 2025-06-18 specification
 */
export class CompletionService {
  private readonly config: CompletionConfig;
  private readonly rateLimitMap = new Map<string, { count: number; resetTime: number }>();

  // Known completion databases
  private readonly drugNames = [
    'aspirin', 'ibuprofen', 'acetaminophen', 'metformin', 'lisinopril',
    'atorvastatin', 'levothyroxine', 'amlodipine', 'metoprolol', 'omeprazole',
    'simvastatin', 'losartan', 'warfarin', 'furosemide', 'prednisone'
  ];

  private readonly searchTypes = [
    'general', 'label', 'adverse_events', 'recalls', 'shortages',
    'device_registration', 'device_pma', 'device_510k', 'device_udi',
    'device_recalls', 'device_adverse_events', 'device_classification'
  ];

  private readonly deviceTypes = [
    'cardiac', 'orthopedic', 'neurological', 'surgical', 'diagnostic',
    'respiratory', 'cardiovascular', 'dental', 'ophthalmic', 'radiology'
  ];

  constructor(config?: Partial<CompletionConfig>) {
    this.config = {
      maxSuggestions: 100,
      rateLimitPerSecond: 10,
      enableFuzzyMatching: true,
      ...config
    };
  }

  /**
   * Handle completion request
   */
  public async complete(request: CompletionRequest): Promise<CompletionResponse> {
    // Validate inputs
    this.validateCompletionRequest(request);

    // Apply rate limiting
    if (!this.checkRateLimit()) {
      throw new Error('Rate limit exceeded for completion requests');
    }

    // Generate suggestions based on context
    const suggestions = await this.generateSuggestions(request);

    // Sort by relevance and limit results
    const sortedSuggestions = suggestions
      .sort((a, b) => (b.score || 0) - (a.score || 0))
      .slice(0, this.config.maxSuggestions);

    return {
      suggestions: sortedSuggestions
    };
  }

  /**
   * Generate suggestions based on the request context
   */
  private async generateSuggestions(request: CompletionRequest): Promise<CompletionSuggestion[]> {
    const { ref, argument } = request;
    const suggestions: CompletionSuggestion[] = [];

    // Handle different argument types
    switch (argument.name) {
      case 'search_term':
        suggestions.push(...this.getSearchTermSuggestions(argument.value, ref.name));
        break;

      case 'search_type':
        suggestions.push(...this.getSearchTypeSuggestions(argument.value, request.context));
        break;

      case 'method':
        suggestions.push(...this.getMethodSuggestions(argument.value));
        break;

      case 'limit':
        suggestions.push(...this.getLimitSuggestions(argument.value));
        break;

      default:
        // Fallback to generic suggestions
        suggestions.push(...this.getGenericSuggestions(argument.value, argument.name));
    }

    return suggestions;
  }

  /**
   * Get search term suggestions
   */
  private getSearchTermSuggestions(currentValue: string, contextName: string): CompletionSuggestion[] {
    const suggestions: CompletionSuggestion[] = [];

    // Drug name suggestions
    const matchingDrugs = this.fuzzyMatch(currentValue, this.drugNames);
    matchingDrugs.forEach(match => {
      suggestions.push({
        value: match.item,
        label: match.item,
        description: `Common drug name: ${match.item}`,
        score: match.score
      });
    });

    // Device type suggestions for device-related contexts
    if (contextName.includes('device')) {
      const matchingDevices = this.fuzzyMatch(currentValue, this.deviceTypes);
      matchingDevices.forEach(match => {
        suggestions.push({
          value: match.item,
          label: match.item,
          description: `Medical device category: ${match.item}`,
          score: match.score * 0.9 // Slightly lower than drug matches
        });
      });
    }

    return suggestions;
  }

  /**
   * Get search type suggestions
   */
  private getSearchTypeSuggestions(currentValue: string, context?: Array<{ name: string; value: string }>): CompletionSuggestion[] {
    const suggestions: CompletionSuggestion[] = [];

    // Filter search types based on method context
    const method = context?.find(c => c.name === 'method')?.value;
    let availableTypes = this.searchTypes;

    if (method === 'lookup_drug') {
      availableTypes = this.searchTypes.filter(type =>
        !type.startsWith('device_')
      );
    } else if (method === 'lookup_device') {
      availableTypes = this.searchTypes.filter(type =>
        type.startsWith('device_') || type === 'general'
      );
    }

    const matches = this.fuzzyMatch(currentValue, availableTypes);
    matches.forEach(match => {
      suggestions.push({
        value: match.item,
        label: match.item,
        description: this.getSearchTypeDescription(match.item),
        score: match.score
      });
    });

    return suggestions;
  }

  /**
   * Get method suggestions
   */
  private getMethodSuggestions(currentValue: string): CompletionSuggestion[] {
    const methods = [
      { value: 'lookup_drug', description: 'Search FDA drug database' },
      { value: 'lookup_device', description: 'Search FDA device database' }
    ];

    return methods
      .filter(method => method.value.includes(currentValue.toLowerCase()))
      .map(method => ({
        value: method.value,
        label: method.value,
        description: method.description,
        score: this.calculateScore(currentValue, method.value)
      }));
  }

  /**
   * Get limit suggestions
   */
  private getLimitSuggestions(currentValue: string): CompletionSuggestion[] {
    const commonLimits = ['5', '10', '20', '50', '100'];

    return commonLimits
      .filter(limit => limit.startsWith(currentValue))
      .map(limit => ({
        value: limit,
        label: `${limit} results`,
        description: `Limit results to ${limit} items`,
        score: this.calculateScore(currentValue, limit)
      }));
  }

  /**
   * Get generic suggestions for unknown argument types
   */
  private getGenericSuggestions(_currentValue: string, argumentName: string): CompletionSuggestion[] {
    // For unknown arguments, provide basic completion based on common patterns
    if (argumentName.includes('field')) {
      return [
        {
          value: 'sponsor_name',
          label: 'sponsor_name',
          description: 'Drug sponsor name field',
          score: 90
        },
        {
          value: 'application_number',
          label: 'application_number',
          description: 'FDA application number field',
          score: 85
        }
      ];
    }

    return [];
  }

  /**
   * Fuzzy matching implementation
   */
  private fuzzyMatch(query: string, items: string[]): Array<{ item: string; score: number }> {
    if (!this.config.enableFuzzyMatching || !query) {
      return items
        .filter(item => item.toLowerCase().includes(query.toLowerCase()))
        .map(item => ({ item, score: 100 }));
    }

    const results: Array<{ item: string; score: number }> = [];

    for (const item of items) {
      const score = this.calculateFuzzyScore(query.toLowerCase(), item.toLowerCase());
      if (score > 30) { // Minimum relevance threshold
        results.push({ item, score });
      }
    }

    return results;
  }

  /**
   * Calculate fuzzy matching score
   */
  private calculateFuzzyScore(query: string, target: string): number {
    if (target.includes(query)) {
      return 100 - (target.length - query.length); // Exact substring match
    }

    // Simple character-based fuzzy scoring
    let score = 0;
    let queryIndex = 0;

    for (let i = 0; i < target.length && queryIndex < query.length; i++) {
      if (target[i] === query[queryIndex]) {
        score += 2;
        queryIndex++;
      }
    }

    // Bonus for matching all characters
    if (queryIndex === query.length) {
      score += 20;
    }

    return Math.min(100, score);
  }

  /**
   * Calculate basic matching score
   */
  private calculateScore(query: string, target: string): number {
    if (target.startsWith(query)) {
      return 100;
    } else if (target.includes(query)) {
      return 80;
    } else {
      return this.calculateFuzzyScore(query, target);
    }
  }

  /**
   * Get description for search types
   */
  private getSearchTypeDescription(searchType: string): string {
    const descriptions: Record<string, string> = {
      'general': 'General drug/device search',
      'label': 'Drug labeling information',
      'adverse_events': 'Adverse event reports',
      'recalls': 'Drug/device recalls',
      'shortages': 'Drug shortage information',
      'device_registration': 'Device registration data',
      'device_pma': 'Premarket approval data',
      'device_510k': '510(k) clearance data',
      'device_udi': 'Unique device identifier data',
      'device_recalls': 'Device recall information',
      'device_adverse_events': 'Device adverse events',
      'device_classification': 'Device classification data'
    };

    return descriptions[searchType] || 'Search type';
  }

  /**
   * Validate completion request
   */
  private validateCompletionRequest(request: CompletionRequest): void {
    if (!request.ref || !request.ref.name) {
      throw new Error('Invalid completion request: missing reference');
    }

    if (!request.argument || !request.argument.name) {
      throw new Error('Invalid completion request: missing argument');
    }

    // Validate argument value is string
    if (typeof request.argument.value !== 'string') {
      throw new Error('Invalid completion request: argument value must be string');
    }
  }

  /**
   * Check rate limiting
   */
  private checkRateLimit(): boolean {
    const now = Date.now();
    const key = 'completion'; // Could be more granular with client ID

    const current = this.rateLimitMap.get(key);
    if (!current || now >= current.resetTime) {
      this.rateLimitMap.set(key, {
        count: 1,
        resetTime: now + 1000 // 1 second window
      });
      return true;
    }

    if (current.count >= this.config.rateLimitPerSecond) {
      return false;
    }

    current.count++;
    return true;
  }

  /**
   * Get completion statistics
   */
  public getStats(): {
    config: CompletionConfig;
    knownItems: {
      drugNames: number;
      searchTypes: number;
      deviceTypes: number;
    };
    rateLimitStatus: Record<string, { count: number; resetTime: number }>;
  } {
    return {
      config: this.config,
      knownItems: {
        drugNames: this.drugNames.length,
        searchTypes: this.searchTypes.length,
        deviceTypes: this.deviceTypes.length
      },
      rateLimitStatus: Object.fromEntries(this.rateLimitMap.entries())
    };
  }
}

// Global completion service instance
export const completionService = new CompletionService();