/**
 * FDA API client with retry logic and error handling
 */

import { FdaRequestParams, FdaResponse, FdaSearchType, FdaMethod, FdaDrugRecord } from '../types/fda.js';
import { FdaError, FdaErrorType } from '../types/index.js';
import { config } from '../config/index.js';
import { logger } from '../logging/index.js';
import { errorHandler } from '../errors/index.js';
import { FDA_API_ENDPOINTS } from '../config/defaults.js';
import { fieldValidator } from './field-definitions.js';

export interface ApiClientOptions {
  timeout?: number;
  retryAttempts?: number;
  retryDelay?: number;
  userAgent?: string;
  deduplicationEnabled?: boolean;
}

export interface RequestOptions {
  timeout?: number;
  signal?: AbortSignal;
}

export class FdaApiClient {
  private baseUrl: string;
  private timeout: number;
  private retryAttempts: number;
  private userAgent: string;
  private deduplicationEnabled: boolean;
  private ongoingRequests: Map<string, Promise<FdaResponse>>;
  private requestStats: {
    totalRequests: number;
    deduplicatedRequests: number;
  };

  constructor(options: ApiClientOptions = {}) {
    this.baseUrl = config.getApiBaseUrl();
    this.timeout = options.timeout || config.getRequestTimeout();
    this.retryAttempts = options.retryAttempts || config.getRetryAttempts();
    this.userAgent = options.userAgent || `fda-mcp-server/${config.getConfig().version}`;
    this.deduplicationEnabled = options.deduplicationEnabled ?? true;
    this.ongoingRequests = new Map();
    this.requestStats = {
      totalRequests: 0,
      deduplicatedRequests: 0
    };
  }

  private buildUrl(endpoint: string, params: URLSearchParams): string {
    const url = new URL(endpoint, this.baseUrl);

    // Append query parameters
    for (const [key, value] of params.entries()) {
      url.searchParams.append(key, value);
    }

    return url.toString();
  }

  private buildSearchQuery(params: FdaRequestParams): string {
    const { search_term, search_type = 'general', method } = params;

    // Check if this is a complex query (contains FDA query syntax)
    const isComplex = this.isComplexQuery(search_term);
    if (isComplex) {
      return search_term;
    }

    // Handle field-specific searches
    const fieldParam = this.getFieldParameter(search_type, params);
    if (fieldParam) {
      const hasWildcards = search_term.includes('*') || search_term.includes('?');
      if (hasWildcards) {
        return `${fieldParam}:${search_term}`;
      } else {
        return `${fieldParam}:"${search_term}"`;
      }
    }

    // Handle different search types with proper field queries
    switch (search_type) {
      case 'label':
        return `(openfda.brand_name:"${search_term}" OR openfda.generic_name:"${search_term}" OR openfda.substance_name:"${search_term}")`;

      case 'adverse_events':
        return `(patient.drug.medicinalproduct:"${search_term}" OR patient.drug.openfda.brand_name:"${search_term}" OR patient.drug.openfda.generic_name:"${search_term}")`;

      case 'recalls':
        if (search_term.match(/^Class\s+(I{1,3}|[123])$/i)) {
          return `classification:"${search_term}"`;
        } else {
          return `product_description:"${search_term}"`;
        }

      case 'shortages':
        return `(openfda.generic_name:"${search_term}" OR openfda.brand_name:"${search_term}" OR proprietary_name:"${search_term}" OR generic_name:"${search_term}")`;

      case 'general':
      default:
        // For general drug searches, search across all relevant fields
        if (method === 'lookup_drug') {
          // Use comprehensive field search for general drug searches
          const allFields = this.getAllDrugFields();
          const hasWildcards = search_term.includes('*') || search_term.includes('?');

          const fieldQueries = allFields.map(fieldName => {
            if (hasWildcards) {
              return `${fieldName}:${search_term}`;
            } else {
              return `${fieldName}:"${search_term}"`;
            }
          });

          return `(${fieldQueries.join(' OR ')})`;
        } else {
          // Device searches
          return `(proprietary_name:"${search_term}" OR establishment_name:"${search_term}")`;
        }
    }
  }

  private isComplexQuery(searchTerm: string): boolean {
    return (
      searchTerm.includes(':') ||
      searchTerm.includes('+AND+') ||
      searchTerm.includes('+OR+') ||
      searchTerm.includes('[') ||
      searchTerm.includes('(') ||
      searchTerm.includes('_exists_:') ||
      searchTerm.includes('_missing_:')
    );
  }

  private getAllDrugFields(): string[] {
    // Fields from original working implementation
    return [
      'application_number',
      'sponsor_name',
      'openfda.application_number',
      'openfda.brand_name',
      'openfda.generic_name',
      'openfda.manufacturer_name',
      'openfda.nui',
      'openfda.package_ndc',
      'openfda.pharm_class_cs',
      'openfda.pharm_class_epc',
      'openfda.pharm_class_pe',
      'openfda.pharm_class_moa',
      'openfda.product_ndc',
      'openfda.product_type',
      'openfda.route',
      'openfda.rxcui',
      'openfda.spl_id',
      'openfda.spl_set_id',
      'openfda.substance_name',
      'openfda.unii',
      'openfda.upc',
      'openfda.dosage_form',
      'openfda.is_original_packager',
      'openfda.original_packager_product_ndc',
      'products.active_ingredients.name',
      'products.active_ingredients.strength',
      'products.brand_name',
      'products.dosage_form',
      'products.marketing_status',
      'products.product_number',
      'products.reference_drug',
      'products.reference_standard',
      'products.route',
      'products.te_code'
    ];
  }

  private getFieldParameter(searchType: FdaSearchType, params: FdaRequestParams): string | undefined {
    const fieldMap: Record<FdaSearchType, keyof FdaRequestParams> = {
      general: 'fields_for_general',
      label: 'fields_for_label',
      adverse_events: 'fields_for_adverse_events',
      recalls: 'fields_for_recalls',
      shortages: 'fields_for_shortages',
      device_registration: 'fields_for_device_registration',
      device_pma: 'fields_for_device_pma',
      device_510k: 'fields_for_device_510k',
      device_udi: 'fields_for_device_udi',
      device_recalls: 'fields_for_device_recalls',
      device_adverse_events: 'fields_for_device_adverse_events',
      device_classification: 'fields_for_device_classification'
    };

    const fieldKey = fieldMap[searchType];
    const fieldValue = fieldKey ? params[fieldKey] as string : undefined;

    // Validate field if provided
    if (fieldValue && !this.validateField(fieldValue, searchType)) {
      throw errorHandler.createError(
        FdaErrorType.VALIDATION_ERROR,
        `Invalid field: ${fieldValue}. Please use one of the valid FDA ${searchType} fields.`,
        'FDA_INVALID_FIELD',
        {
          invalidField: fieldValue,
          searchType,
          validFields: fieldValidator.getValidFields(searchType).slice(0, 10) // Show first 10 as examples
        }
      );
    }

    return fieldValue;
  }

  /**
   * Validate if a field is valid for the given search type
   */
  private validateField(field: string, searchType: FdaSearchType): boolean {
    return fieldValidator.validateField(field, searchType);
  }

  /**
   * Get list of valid fields for a search type
   */
  public getValidFields(searchType: FdaSearchType): string[] {
    return fieldValidator.getValidFields(searchType);
  }


  private getEndpoint(method: FdaMethod, searchType: FdaSearchType): string {
    if (method === 'lookup_drug') {
      const drugType = searchType as keyof typeof FDA_API_ENDPOINTS.drug;
      return FDA_API_ENDPOINTS.drug[drugType] || FDA_API_ENDPOINTS.drug.general;
    } else {
      const deviceType = searchType.replace('device_', '') as keyof typeof FDA_API_ENDPOINTS.device;
      return FDA_API_ENDPOINTS.device[deviceType] || FDA_API_ENDPOINTS.device.registration;
    }
  }

  private buildQueryParams(params: FdaRequestParams): URLSearchParams {
    const queryParams = new URLSearchParams();

    // Build search query
    const searchQuery = this.buildSearchQuery(params);
    queryParams.append('search', searchQuery);

    // Add limit
    if (params.limit) {
      queryParams.append('limit', params.limit.toString());
    }

    // Add count parameter for aggregation
    if (params.count) {
      queryParams.append('count', params.count);
    }

    // Add pharmacological class filter for drugs
    if (params.pharm_class && params.method === 'lookup_drug') {
      const pharmQuery = `openfda.pharm_class_epc:"${params.pharm_class}"`;
      const existingSearch = queryParams.get('search');
      if (existingSearch) {
        queryParams.set('search', `${existingSearch}+AND+${pharmQuery}`);
      } else {
        queryParams.set('search', pharmQuery);
      }
    }

    // Add field existence filter
    if (params.field_exists) {
      queryParams.append('search', `_exists_:${params.field_exists}`);
    }

    return queryParams;
  }

  private async makeRequest(
    url: string,
    requestId: string,
    options: RequestOptions = {}
  ): Promise<Response> {
    const controller = new AbortController();
    const timeoutMs = options.timeout || this.timeout;
    const timeoutId = setTimeout(() => {
      controller.abort();
      logger.warn(`Request timeout after ${timeoutMs}ms`, { url }, {
        component: 'FDA_API_CLIENT',
        requestId
      });
    }, timeoutMs);

    try {
      const headers: Record<string, string> = {
        'User-Agent': this.userAgent,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      };

      // Add API key if available
      const apiKey = config.getConfig().fdaApiBaseUrl.includes('api.fda.gov') ? undefined : process.env.FDA_API_KEY;
      if (apiKey) {
        headers['Authorization'] = `Bearer ${apiKey}`;
      }

      logger.apiCall(url, {}, requestId);
      logger.debug(`FDA API URL: ${url} (timeout: ${timeoutMs}ms)`, {}, { component: 'FDA_API_CLIENT', requestId });
      const startTime = Date.now();

      const response = await fetch(url, {
        method: 'GET',
        headers,
        signal: options.signal || controller.signal
      });

      const duration = Date.now() - startTime;
      logger.apiResponse(url, response.status, duration, requestId);

      return response;
    } catch (error) {
      // Enhanced timeout error handling
      if (error instanceof Error && (error.name === 'AbortError' || error.message.includes('aborted'))) {
        throw errorHandler.createError(
          FdaErrorType.TIMEOUT_ERROR,
          `Request timeout after ${timeoutMs}ms`,
          'FDA_TIMEOUT',
          { url, timeoutMs },
          undefined,
          requestId
        );
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  private async processResponse(response: Response, requestId: string): Promise<{ results?: unknown[]; meta?: Record<string, unknown>; [key: string]: unknown }> {
    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      throw errorHandler.createError(
        response.status >= 500 ? FdaErrorType.API_ERROR : FdaErrorType.VALIDATION_ERROR,
        `FDA API error: ${response.status} ${response.statusText}`,
        `FDA_${response.status}`,
        {
          status: response.status,
          statusText: response.statusText,
          body: errorText
        },
        undefined,
        requestId
      );
    }

    try {
      const data = await response.json();
      logger.debug(`FDA API raw response: ${JSON.stringify(data).substring(0, 500)}...`, {}, { component: 'FDA_API_CLIENT', requestId });
      return data;
    } catch (error) {
      throw errorHandler.createError(
        FdaErrorType.API_ERROR,
        'Invalid JSON response from FDA API',
        'FDA_INVALID_RESPONSE',
        { originalError: (error as Error).message },
        error as Error,
        requestId
      );
    }
  }

  private async executeWithRetry<T>(
    operation: () => Promise<T>,
    requestId: string,
    context: string
  ): Promise<T> {
    let lastError: FdaError | undefined;

    for (let attempt = 0; attempt <= this.retryAttempts; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = errorHandler.handleApiError(error, context, requestId);

        if (attempt === this.retryAttempts || !errorHandler.isRetryableError(lastError)) {
          break;
        }

        const delay = errorHandler.getRetryDelay(lastError, attempt);
        logger.warn(`Retry attempt ${attempt + 1}/${this.retryAttempts} after ${delay}ms`, {
          error: lastError.message,
          delay
        }, {
          component: 'FDA_API_CLIENT',
          requestId,
          operation: context
        });

        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    throw lastError;
  }

  /**
   * Generate a unique key for request deduplication
   */
  private generateRequestKey(params: FdaRequestParams): string {
    // Create a consistent key based on request parameters
    const keyParams = {
      method: params.method,
      search_term: params.search_term,
      search_type: params.search_type || 'general',
      limit: params.limit || 10,
      count: params.count,
      field_exists: params.field_exists,
      pharm_class: params.pharm_class
    };

    // Sort keys for consistent hashing
    const sortedParams = Object.keys(keyParams)
      .sort()
      .reduce((result: Record<string, any>, key) => {
        const value = (keyParams as any)[key];
        if (value !== undefined) {
          result[key] = value;
        }
        return result;
      }, {});

    return JSON.stringify(sortedParams);
  }

  /**
   * Get request deduplication statistics
   */
  public getRequestStats(): { totalRequests: number; deduplicatedRequests: number; deduplicationRate: number } {
    const deduplicationRate = this.requestStats.totalRequests > 0
      ? (this.requestStats.deduplicatedRequests / this.requestStats.totalRequests) * 100
      : 0;

    return {
      ...this.requestStats,
      deduplicationRate: Math.round(deduplicationRate * 100) / 100
    };
  }

  public async search(params: FdaRequestParams, requestId: string): Promise<FdaResponse> {
    this.requestStats.totalRequests++;

    // Skip deduplication if disabled
    if (!this.deduplicationEnabled) {
      return this.executeWithRetry(async () => {
        const endpoint = this.getEndpoint(params.method, params.search_type || 'general');
        const queryParams = this.buildQueryParams(params);
        const url = this.buildUrl(endpoint, queryParams);

        const response = await this.makeRequest(url, requestId);
        const data = await this.processResponse(response, requestId);

        return this.transformResponse(data, params, requestId);
      }, requestId, 'search');
    }

    // Generate unique key for this request
    const requestKey = this.generateRequestKey(params);

    // Check if identical request is already in progress
    if (this.ongoingRequests.has(requestKey)) {
      this.requestStats.deduplicatedRequests++;

      logger.debug('Request deduplication: using existing request', {
        requestKey: requestKey.substring(0, 50) + '...',
        deduplicationRate: this.getRequestStats().deduplicationRate
      }, {
        component: 'FDA_API_CLIENT',
        requestId
      });

      // Return the existing promise
      return this.ongoingRequests.get(requestKey)!;
    }

    // Create new request promise
    const requestPromise = this.executeWithRetry(async () => {
      const endpoint = this.getEndpoint(params.method, params.search_type || 'general');
      const queryParams = this.buildQueryParams(params);
      const url = this.buildUrl(endpoint, queryParams);

      const response = await this.makeRequest(url, requestId);
      const data = await this.processResponse(response, requestId);

      // Transform API response to standardized format
      return this.transformResponse(data, params, requestId);
    }, requestId, 'search');

    // Store the promise for deduplication
    this.ongoingRequests.set(requestKey, requestPromise);

    // Clean up after request completes (success or failure)
    requestPromise.finally(() => {
      this.ongoingRequests.delete(requestKey);

      logger.debug('Request completed, cleaned up from deduplication cache', {
        requestKey: requestKey.substring(0, 50) + '...',
        ongoingRequests: this.ongoingRequests.size
      }, {
        component: 'FDA_API_CLIENT',
        requestId
      });
    });

    return requestPromise;
  }

  private transformResponse(data: { results?: unknown[]; meta?: Record<string, unknown>; [key: string]: unknown }, params: FdaRequestParams, requestId: string): FdaResponse {
    const results = (data.results as FdaDrugRecord[]) || [];
    const meta = data.meta || {};

    logger.debug(`Transform data: ${JSON.stringify(data).substring(0, 200)}...`, {}, { component: 'FDA_API_CLIENT', requestId });
    logger.debug(`Transform params: ${JSON.stringify(params)}`, {}, { component: 'FDA_API_CLIENT', requestId });

    return {
      success: true,
      query: params.search_term,
      search_type: params.search_type || 'general',
      total_results: (meta.results as { total?: number })?.total || results.length,
      results: results,
      metadata: {
        total: (meta.results as { total?: number })?.total || results.length,
        skip: (meta.results as { skip?: number })?.skip || 0,
        limit: (meta.results as { limit?: number })?.limit || params.limit || 10
      }
    };
  }

  public async healthCheck(requestId: string): Promise<boolean> {
    try {
      const url = this.buildUrl('/drug/drugsfda.json', new URLSearchParams([
        ['search', 'sponsor_name:pfizer'],
        ['limit', '1']
      ]));

      const response = await this.makeRequest(url, requestId, { timeout: 5000 });
      return response.ok;
    } catch (error) {
      logger.error('FDA API health check failed', error as Error, {
        component: 'FDA_API_CLIENT',
        requestId,
        operation: 'healthCheck'
      });
      return false;
    }
  }

  public getBaseUrl(): string {
    return this.baseUrl;
  }

  public setTimeout(timeout: number): void {
    this.timeout = timeout;
  }

  /**
   * Clear all ongoing requests (useful for cleanup/testing)
   */
  public clearOngoingRequests(): void {
    const clearedCount = this.ongoingRequests.size;
    this.ongoingRequests.clear();

    if (clearedCount > 0) {
      logger.warn(`Cleared ${clearedCount} ongoing requests from deduplication cache`, {}, {
        component: 'FDA_API_CLIENT'
      });
    }
  }

  /**
   * Get current status of ongoing requests
   */
  public getOngoingRequestsStatus(): {
    count: number;
    keys: string[];
  } {
    return {
      count: this.ongoingRequests.size,
      keys: Array.from(this.ongoingRequests.keys()).map(key =>
        key.length > 100 ? key.substring(0, 100) + '...' : key
      )
    };
  }

  public setRetryAttempts(attempts: number): void {
    this.retryAttempts = attempts;
  }
}