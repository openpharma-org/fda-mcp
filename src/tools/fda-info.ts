/**
 * FDA information lookup tool implementation
 */

import { BaseTool, CancellationToken } from './base.js';
import { FdaRequestParams } from '../types/fda.js';
import { McpFdaRequestParamsSchema } from '../types/mcp-schemas.js';
import { ToolExecutionResult } from '../types/index.js';
import { FdaApiClient } from '../api/client.js';
import { cacheService } from '../utils/cache.js';
import { toolRateLimiter } from '../utils/rate-limiter.js';
import { logger } from '../logging/index.js';
import { errorHandler } from '../errors/index.js';

export class FdaInfoTool extends BaseTool<FdaRequestParams> {
  private apiClient: FdaApiClient;

  constructor() {
    super(
      'fda_info',
      'Unified tool for FDA drug and medical device information lookup. Access drug labels, adverse events, regulatory information, recalls, shortages, and device registration data from the openFDA database.',
      McpFdaRequestParamsSchema
    );

    this.apiClient = new FdaApiClient();
  }

  protected async execute(
    params: FdaRequestParams,
    requestId: string,
    cancellationToken?: CancellationToken
  ): Promise<ToolExecutionResult> {
    const startTime = Date.now();

    try {
      // Check for cancellation early
      if (cancellationToken?.isCancelled) {
        throw new Error(`Operation cancelled: ${cancellationToken.reason || 'No reason provided'}`);
      }

      // Apply rate limiting
      this.reportProgress(requestId, {
        requestId,
        stage: 'rate_limiting',
        progress: 30,
        message: 'Checking rate limits',
        timestamp: new Date().toISOString()
      });

      const rateLimitInfo = toolRateLimiter.consume('fda_api', requestId);
      if (rateLimitInfo.isExceeded) {
        throw errorHandler.handleRateLimitError(
          rateLimitInfo.limit,
          60000, // 1 minute window
          requestId
        );
      }

      // Check for cancellation after rate limiting
      if (cancellationToken?.isCancelled) {
        throw new Error(`Operation cancelled after rate limiting: ${cancellationToken.reason || 'No reason provided'}`);
      }

      // Check cache first
      this.reportProgress(requestId, {
        requestId,
        stage: 'cache_check',
        progress: 40,
        message: 'Checking cache for existing results',
        timestamp: new Date().toISOString()
      });

      const cacheKey = this.buildCacheKey(params);
      const cachedResult = cacheService.get(cacheKey, requestId);
      if (cachedResult) {
        this.reportProgress(requestId, {
          requestId,
          stage: 'cache_hit',
          progress: 90,
          message: 'Found cached result',
          timestamp: new Date().toISOString()
        });

        return {
          success: true,
          data: cachedResult as any,
          metadata: {
            executionTime: Date.now() - startTime,
            requestId,
            fromCache: true
          }
        };
      }

      // Log tool execution
      logger.toolExecution(this.toolName, params as any, requestId);

      // Validate search parameters
      this.reportProgress(requestId, {
        requestId,
        stage: 'validation',
        progress: 50,
        message: 'Validating search parameters',
        timestamp: new Date().toISOString()
      });

      this.validateSearchParams(params);

      // Check for cancellation before API call
      if (cancellationToken?.isCancelled) {
        throw new Error(`Operation cancelled before API call: ${cancellationToken.reason || 'No reason provided'}`);
      }

      // Execute FDA API search
      this.reportProgress(requestId, {
        requestId,
        stage: 'api_call',
        progress: 60,
        message: 'Calling FDA API',
        timestamp: new Date().toISOString()
      });

      const apiResponse = await this.apiClient.search(params, requestId);

      // Check for cancellation after API call
      if (cancellationToken?.isCancelled) {
        throw new Error(`Operation cancelled after API call: ${cancellationToken.reason || 'No reason provided'}`);
      }

      // Process and enhance the response
      this.reportProgress(requestId, {
        requestId,
        stage: 'processing',
        progress: 80,
        message: 'Processing API response',
        timestamp: new Date().toISOString()
      });

      const processedData = this.processApiResponse(apiResponse as any, params);

      // Cache the result
      this.reportProgress(requestId, {
        requestId,
        stage: 'caching',
        progress: 90,
        message: 'Caching processed results',
        timestamp: new Date().toISOString()
      });

      cacheService.set(cacheKey, processedData, undefined, requestId);

      const executionTime = Date.now() - startTime;

      return {
        success: true,
        data: processedData as any,
        metadata: {
          executionTime,
          requestId,
          fromCache: false
        }
      };

    } catch (error) {
      const fdaError = errorHandler.handleUnexpectedError(error, 'FdaInfoTool.execute', requestId);

      // Check if this was a cancellation
      const wasCancelled = cancellationToken?.isCancelled ||
                          fdaError.message.includes('cancelled') ||
                          fdaError.message.includes('aborted');

      return {
        success: false,
        error: {
          error: fdaError.message,
          code: wasCancelled ? 'OPERATION_CANCELLED' : fdaError.code,
          success: false
        },
        metadata: {
          executionTime: Date.now() - startTime,
          requestId,
          cancelled: wasCancelled
        }
      };
    }
  }

  private buildCacheKey(params: FdaRequestParams): string {
    // Create a deterministic cache key from parameters
    const keyParts = [
      params.method,
      params.search_type || 'general',
      params.search_term,
      params.limit?.toString() || '10',
      params.count || '',
      params.pharm_class || '',
      params.field_exists || ''
    ];

    // Add field-specific parameters
    const fieldParams = [
      params.fields_for_general,
      params.fields_for_adverse_events,
      params.fields_for_label,
      params.fields_for_recalls,
      params.fields_for_shortages,
      params.fields_for_device_registration,
      params.fields_for_device_pma,
      params.fields_for_device_510k,
      params.fields_for_device_udi,
      params.fields_for_device_recalls,
      params.fields_for_device_adverse_events,
      params.fields_for_device_classification
    ].filter(Boolean);

    return `fda_tool:${keyParts.join(':')}:${fieldParams.join(':')}`;
  }

  private validateSearchParams(params: FdaRequestParams): void {
    const errors: string[] = [];

    // Validate search term length
    if (params.search_term.length > 500) {
      errors.push('Search term must be 500 characters or less');
    }

    // Validate search term is not empty after trimming
    if (!params.search_term.trim()) {
      errors.push('Search term cannot be empty');
    }

    // Validate method and search_type compatibility
    if (params.method === 'lookup_drug') {
      const validDrugTypes = ['general', 'label', 'adverse_events', 'recalls', 'shortages'];
      if (params.search_type && !validDrugTypes.includes(params.search_type)) {
        errors.push(`Invalid search_type for drug lookup: ${params.search_type}`);
      }
    } else if (params.method === 'lookup_device') {
      const validDeviceTypes = [
        'device_registration', 'device_pma', 'device_510k', 'device_udi',
        'device_recalls', 'device_adverse_events', 'device_classification'
      ];
      if (params.search_type && !validDeviceTypes.includes(params.search_type)) {
        errors.push(`Invalid search_type for device lookup: ${params.search_type}`);
      }
    }

    // Validate limit bounds
    if (params.limit !== undefined && (params.limit < 1 || params.limit > 100)) {
      errors.push('Limit must be between 1 and 100');
    }

    if (errors.length > 0) {
      throw errorHandler.handleValidationError(errors);
    }
  }

  private processApiResponse(apiResponse: Record<string, unknown>, params: FdaRequestParams): Record<string, unknown> {
    logger.debug(`ProcessApiResponse input: ${JSON.stringify(apiResponse).substring(0, 200)}...`, {}, { component: 'FDA_INFO_TOOL' });

    const processed = {
      ...apiResponse,
      search_parameters: {
        method: params.method,
        search_term: params.search_term,
        search_type: params.search_type || 'general',
        limit: params.limit || 10
      },
      summary: this.generateSummary(apiResponse, params)
    };

    // Add enhanced metadata
    if (apiResponse.results && Array.isArray(apiResponse.results)) {
      (processed as any).enhanced_metadata = {
        result_count: apiResponse.results.length,
        has_more_results: apiResponse.results.length === (params.limit || 10),
        search_categories: this.categorizeResults(apiResponse.results, params.method),
        data_quality_score: this.calculateDataQuality(apiResponse.results)
      };
    }

    logger.debug(`ProcessApiResponse output: ${JSON.stringify(processed).substring(0, 200)}...`, {}, { component: 'FDA_INFO_TOOL' });
    return processed;
  }

  private generateSummary(apiResponse: Record<string, unknown>, params: FdaRequestParams): string {
    const resultCount = (apiResponse.results as any)?.length || 0;
    const totalResults = (apiResponse.metadata as any)?.total || resultCount;
    const searchType = params.search_type || 'general';
    const entity = params.method === 'lookup_drug' ? 'drugs' : 'devices';

    if (resultCount === 0) {
      return `No ${entity} found matching "${params.search_term}" in ${searchType} search.`;
    }

    if (resultCount === 1) {
      return `Found 1 ${entity.slice(0, -1)} matching "${params.search_term}" in ${searchType} search.`;
    }

    if (totalResults > resultCount) {
      return `Found ${resultCount} of ${totalResults} ${entity} matching "${params.search_term}" in ${searchType} search. Use limit parameter to see more results.`;
    }

    return `Found ${resultCount} ${entity} matching "${params.search_term}" in ${searchType} search.`;
  }

  private categorizeResults(results: Record<string, unknown>[], method: string): Record<string, number> {
    const categories: Record<string, number> = {};

    if (method === 'lookup_drug') {
      results.forEach(result => {
        // Categorize by marketing status
        const status = (result as any).products?.[0]?.marketing_status || 'Unknown';
        categories[status] = (categories[status] || 0) + 1;
      });
    } else {
      results.forEach(result => {
        // Categorize by device class or type
        const deviceClass = (result as any).device_class || (result as any).medical_specialty_description || 'Unknown';
        categories[deviceClass] = (categories[deviceClass] || 0) + 1;
      });
    }

    return categories;
  }

  private calculateDataQuality(results: Record<string, unknown>[]): number {
    if (!results || results.length === 0) return 0;

    let totalScore = 0;
    results.forEach(result => {
      let score = 0;

      // Check for key fields presence
      if ((result as any).sponsor_name || (result as any).applicant) score += 20;
      if (result.products || result.device_name) score += 20;
      if (result.submissions || result.decision_date) score += 20;
      if (result.openfda) score += 20;
      if (result.application_number || result.k_number) score += 20;

      totalScore += score;
    });

    return Math.round(totalScore / results.length);
  }

  // Health check method
  public async healthCheck(requestId: string): Promise<boolean> {
    try {
      return await this.apiClient.healthCheck(requestId);
    } catch (error) {
      logger.error('FDA tool health check failed', error as Error, {
        component: 'FDA_TOOL',
        requestId,
        operation: 'healthCheck'
      });
      return false;
    }
  }

  // Method to get tool statistics
  public getStats(): {
    cacheStats: Record<string, unknown>;
    rateLimitStats: Record<string, unknown>;
    apiClientStats: Record<string, unknown>;
  } {
    return {
      cacheStats: cacheService.getStats() as any,
      rateLimitStats: toolRateLimiter.getStats() as any,
      apiClientStats: {
        ...this.apiClient.getRequestStats(),
        ongoingRequests: this.apiClient.getOngoingRequestsStatus()
      } as any
    };
  }

  // Method to clear caches
  public clearCache(requestId?: string): void {
    // Clear only FDA-related cache entries
    const keys = cacheService.getKeys();
    const fdaKeys = keys.filter(key => key.startsWith('fda_tool:'));

    fdaKeys.forEach(key => cacheService.delete(key, requestId));

    logger.info(`Cleared ${fdaKeys.length} FDA tool cache entries`, {
      clearedKeys: fdaKeys.length
    }, {
      component: 'FDA_TOOL',
      requestId
    });
  }
}