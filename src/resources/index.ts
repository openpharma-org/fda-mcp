/**
 * Resource registry for FDA MCP Server
 * Manages resource registration and lookup
 */

import { BaseResource, ResourceDefinition } from './base.js';
// ServerInfoResource removed - not needed
import { CurrentSafetyAlertsResource } from './current-safety-alerts.js';
import { TopDrugsByAdverseEventsResource } from './trending-adverse-events.js';
import { RecentSafetyAlertsResource } from './emerging-safety-signals.js';
import { RecentApprovalsResource } from './recent-approvals.js';
import { ActiveRecallsResource } from './active-recalls.js';
import { CurrentShortagesResource } from './current-shortages.js';
import { HighRiskTherapeuticAreasResource } from './high-risk-therapeutic-areas.js';
import { RegulatoryPathwaysResource } from './regulatory-pathways.js';
import { logger } from '../logging/index.js';
import { paginationService } from '../utils/pagination.js';
import { PaginatedRequest, PaginatedResponse } from '../utils/pagination.js';

/**
 * Registry for managing MCP resources
 */
class ResourceRegistry {
  private resources = new Map<string, BaseResource>();

  /**
   * Register a resource
   */
  register(resource: BaseResource): void {
    const uri = resource.getUri();

    if (this.resources.has(uri)) {
      logger.warn('Resource already registered, overwriting', {
        resourceUri: uri,
        resourceName: resource.getName()
      }, {
        component: 'RESOURCE_REGISTRY'
      });
    }

    this.resources.set(uri, resource);

    logger.debug('Resource registered', {
      resourceUri: uri,
      resourceName: resource.getName(),
      resourceDescription: resource.getDescription(),
      mimeType: resource.getMimeType()
    }, {
      component: 'RESOURCE_REGISTRY'
    });
  }

  /**
   * Get a resource by URI
   */
  get(uri: string): BaseResource | undefined {
    return this.resources.get(uri);
  }

  /**
   * List all registered resources
   */
  list(): ResourceDefinition[] {
    return Array.from(this.resources.values()).map(resource =>
      resource.getResourceDefinition()
    );
  }

  /**
   * List resources with pagination support
   */
  listPaginated(request: PaginatedRequest): PaginatedResponse<ResourceDefinition> {
    const allResources = this.list();
    return paginationService.paginateArray(allResources, request, 10);
  }

  /**
   * Check if a resource exists
   */
  has(uri: string): boolean {
    return this.resources.has(uri);
  }

  /**
   * Remove a resource
   */
  unregister(uri: string): boolean {
    const removed = this.resources.delete(uri);

    if (removed) {
      logger.debug('Resource unregistered', {
        resourceUri: uri
      }, {
        component: 'RESOURCE_REGISTRY'
      });
    }

    return removed;
  }

  /**
   * Get resource count
   */
  count(): number {
    return this.resources.size;
  }

  /**
   * Clear all resources (primarily for testing)
   */
  clear(): void {
    this.resources.clear();
    logger.debug('All resources cleared', {}, {
      component: 'RESOURCE_REGISTRY'
    });
  }
}

// Global registry instance
export const resourceRegistry = new ResourceRegistry();

/**
 * Register default resources
 */
export async function registerDefaultResources(server?: any): Promise<void> {
  try {
    // Import settings manager (done here to avoid circular dependencies)
    const { settingsManager } = await import('../config/settings.js');
    const settings = settingsManager.getSettings();

    if (!settings.features.resources.enabled) {
      logger.info('Resources are disabled in configuration', {}, {
        component: 'RESOURCE_REGISTRY'
      });
      return;
    }

    const enabledResources = settingsManager.getEnabledResources();
    logger.info('Registering enabled resources', {
      enabledResources: enabledResources,
      totalAvailable: 8 // Updated after removing server_info
    }, {
      component: 'RESOURCE_REGISTRY'
    });

    // Map of resource keys to their instances
    const resourceMap = new Map<string, BaseResource>();

    // Create only enabled resources based on settings
    if (settingsManager.isResourceEnabled('current_safety_alerts')) {
      resourceMap.set('current_safety_alerts', new CurrentSafetyAlertsResource());
    }
    if (settingsManager.isResourceEnabled('trending_adverse_events')) {
      resourceMap.set('trending_adverse_events', new TopDrugsByAdverseEventsResource());
    }
    if (settingsManager.isResourceEnabled('emerging_safety_signals')) {
      resourceMap.set('emerging_safety_signals', new RecentSafetyAlertsResource());
    }
    if (settingsManager.isResourceEnabled('recent_approvals')) {
      resourceMap.set('recent_approvals', new RecentApprovalsResource());
    }
    if (settingsManager.isResourceEnabled('active_recalls')) {
      resourceMap.set('active_recalls', new ActiveRecallsResource());
    }
    if (settingsManager.isResourceEnabled('current_shortages')) {
      resourceMap.set('current_shortages', new CurrentShortagesResource());
    }
    if (settingsManager.isResourceEnabled('high_risk_therapeutic_areas')) {
      resourceMap.set('high_risk_therapeutic_areas', new HighRiskTherapeuticAreasResource());
    }
    if (settingsManager.isResourceEnabled('regulatory_pathways')) {
      resourceMap.set('regulatory_pathways', new RegulatoryPathwaysResource());
    }

    const resources = Array.from(resourceMap.values());

    // Register with SDK if server is provided
    if (server) {
      resources.forEach(resource => resource.register(server));
    }

    // Also register with our internal registry for tracking
    resources.forEach(resource => resourceRegistry.register(resource));

    logger.info('Default resources registered', {
      resourceCount: resourceRegistry.count(),
      enabledCount: resources.length,
      serverRegistration: !!server
    }, {
      component: 'RESOURCE_REGISTRY'
    });

  } catch (error) {
    logger.error('Failed to load settings for resources, registering all resources', error as Error, {
      component: 'RESOURCE_REGISTRY'
    });

    // Fallback: register all resources if settings loading fails
    try {
      const resources = [
        new CurrentSafetyAlertsResource(),
        new TopDrugsByAdverseEventsResource(),
        new RecentSafetyAlertsResource(),
        new RecentApprovalsResource(),
        new ActiveRecallsResource(),
        new CurrentShortagesResource(),
        new HighRiskTherapeuticAreasResource(),
        new RegulatoryPathwaysResource()
      ];

      if (server) {
        resources.forEach(resource => resource.register(server));
      }
      resources.forEach(resource => resourceRegistry.register(resource));

      logger.info('Fallback resources registered', {
        resourceCount: resourceRegistry.count()
      }, {
        component: 'RESOURCE_REGISTRY'
      });
    } catch (fallbackError) {
      logger.error('Failed to register fallback resources', fallbackError as Error, {
        component: 'RESOURCE_REGISTRY'
      });
      throw fallbackError;
    }
  }
}

// Export resource classes
export {
  BaseResource,
  CurrentSafetyAlertsResource,
  TopDrugsByAdverseEventsResource,
  RecentSafetyAlertsResource,
  RecentApprovalsResource,
  ActiveRecallsResource,
  CurrentShortagesResource,
  HighRiskTherapeuticAreasResource,
  RegulatoryPathwaysResource
};
export type { ResourceDefinition } from './base.js';