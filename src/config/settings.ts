/**
 * Settings management system for FDA MCP Server
 * Handles loading and validation of configuration from fda-config.json
 */

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { logger } from '../logging/index.js';

export interface FeatureConfig {
  enabled: boolean;
  description?: string;
}

export interface ToolsConfig {
  enabled: boolean;
  fda_info: FeatureConfig;
}

export interface PromptsConfig {
  enabled: boolean;
  fda_company_portfolio_analysis: FeatureConfig;
  fda_drug_safety_profile: FeatureConfig;
  fda_generic_competition_landscape: FeatureConfig;
  fda_supply_chain_risk_assessment: FeatureConfig;
  fda_regulatory_due_diligence: FeatureConfig;
  fda_market_access_analysis: FeatureConfig;
  fda_weekly_surveillance_report: FeatureConfig;
}

export interface ResourcesConfig {
  enabled: boolean;
  current_safety_alerts: FeatureConfig;
  trending_adverse_events: FeatureConfig;
  emerging_safety_signals: FeatureConfig;
  recent_approvals: FeatureConfig;
  active_recalls: FeatureConfig;
  current_shortages: FeatureConfig;
  high_risk_therapeutic_areas: FeatureConfig;
  regulatory_pathways: FeatureConfig;
}

export interface FeaturesConfig {
  tools: ToolsConfig;
  prompts: PromptsConfig;
  resources: ResourcesConfig;
}

export interface ServerConfig {
  name: string;
  version: string;
  description: string;
  enableLogging: boolean;
  logLevel: string;
}

export interface ApiConfig {
  fda: {
    enabled: boolean;
    baseUrl: string;
    rateLimiting: {
      enabled: boolean;
      requestsPerMinute: number;
      requestsPerDay: number;
    };
    timeout: number;
    retries: number;
  };
}

export interface CachingConfig {
  enabled: boolean;
  defaultTtl: number;
  maxSize: number;
  cleanupInterval: number;
}

export interface PerformanceConfig {
  enableMetrics: boolean;
  enableProfiling: boolean;
  maxConcurrentRequests: number;
}

export interface SecurityConfig {
  enableInputValidation: boolean;
  enableOutputSanitization: boolean;
  maxPayloadSize: string;
}

export interface DevelopmentConfig {
  enableDebugMode: boolean;
  enableVerboseLogging: boolean;
  enableTestMode: boolean;
}

export interface FdaServerSettings {
  server: ServerConfig;
  features: FeaturesConfig;
  api: ApiConfig;
  caching: CachingConfig;
  performance: PerformanceConfig;
  security: SecurityConfig;
  development: DevelopmentConfig;
}

class SettingsManager {
  private settings: FdaServerSettings | null = null;
  private configPath: string;
  private fallbackSettings: Partial<FdaServerSettings>;

  constructor() {
    // Look for config file in project root
    this.configPath = join(process.cwd(), 'fda-config.json');

    // Define fallback settings for when config file is missing
    this.fallbackSettings = {
      server: {
        name: "FDA MCP Server",
        version: "1.0.0",
        description: "FDA MCP Server for drug and device information lookup",
        enableLogging: true,
        logLevel: "info"
      },
      features: {
        tools: {
          enabled: true,
          fda_info: { enabled: true }
        },
        prompts: {
          enabled: true,
          fda_company_portfolio_analysis: { enabled: true },
          fda_drug_safety_profile: { enabled: true },
          fda_generic_competition_landscape: { enabled: true },
          fda_supply_chain_risk_assessment: { enabled: true },
          fda_regulatory_due_diligence: { enabled: true },
          fda_market_access_analysis: { enabled: true },
          fda_weekly_surveillance_report: { enabled: false }
        },
        resources: {
          enabled: true,
          current_safety_alerts: { enabled: true },
          trending_adverse_events: { enabled: true },
          emerging_safety_signals: { enabled: false },
          recent_approvals: { enabled: false },
          active_recalls: { enabled: true },
          current_shortages: { enabled: true },
          high_risk_therapeutic_areas: { enabled: true },
          regulatory_pathways: { enabled: false }
        }
      },
      api: {
        fda: {
          enabled: true,
          baseUrl: "https://api.fda.gov",
          rateLimiting: {
            enabled: true,
            requestsPerMinute: 240,
            requestsPerDay: 120000
          },
          timeout: 30000,
          retries: 3
        }
      },
      caching: {
        enabled: true,
        defaultTtl: 300000,
        maxSize: 1000,
        cleanupInterval: 600000
      }
    };
  }

  /**
   * Load settings from config file or use fallbacks
   */
  public loadSettings(): FdaServerSettings {
    if (this.settings) {
      return this.settings;
    }

    try {
      if (existsSync(this.configPath)) {
        logger.info('Loading settings from config file', {
          configPath: this.configPath
        }, {
          component: 'SETTINGS_MANAGER'
        });

        const configContent = readFileSync(this.configPath, 'utf-8');
        const parsedConfig = JSON.parse(configContent) as FdaServerSettings;

        // Validate and merge with fallbacks
        this.settings = this.validateAndMergeSettings(parsedConfig);

        logger.info('Settings loaded successfully', {
          toolsEnabled: this.settings.features.tools.enabled,
          promptsEnabled: this.settings.features.prompts.enabled,
          resourcesEnabled: this.settings.features.resources.enabled
        }, {
          component: 'SETTINGS_MANAGER'
        });

      } else {
        logger.warn('Config file not found, using fallback settings', {
          configPath: this.configPath
        }, {
          component: 'SETTINGS_MANAGER'
        });

        this.settings = this.fallbackSettings as FdaServerSettings;
      }

    } catch (error) {
      logger.error('Failed to load settings, using fallbacks', error as Error, {
        component: 'SETTINGS_MANAGER',
        operation: 'loadSettings'
      });

      this.settings = this.fallbackSettings as FdaServerSettings;
    }

    return this.settings;
  }

  /**
   * Validate settings and merge with fallbacks for missing properties
   */
  private validateAndMergeSettings(config: Partial<FdaServerSettings>): FdaServerSettings {
    // Deep merge with fallback settings
    const merged = this.deepMerge(this.fallbackSettings, config) as FdaServerSettings;

    // Additional validation can be added here
    return merged;
  }

  /**
   * Deep merge two objects
   */
  private deepMerge(target: any, source: any): any {
    const result = { ...target };

    for (const key in source) {
      if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        result[key] = this.deepMerge(target[key] || {}, source[key]);
      } else {
        result[key] = source[key];
      }
    }

    return result;
  }

  /**
   * Get current settings
   */
  public getSettings(): FdaServerSettings {
    if (!this.settings) {
      return this.loadSettings();
    }
    return this.settings;
  }

  /**
   * Check if a tool is enabled
   */
  public isToolEnabled(toolName: keyof ToolsConfig): boolean {
    const settings = this.getSettings();
    if (!settings.features.tools.enabled) return false;

    const toolConfig = settings.features.tools[toolName];
    return toolConfig && typeof toolConfig === 'object' ? toolConfig.enabled : false;
  }

  /**
   * Check if a prompt is enabled
   */
  public isPromptEnabled(promptName: keyof PromptsConfig): boolean {
    const settings = this.getSettings();
    if (!settings.features.prompts.enabled) return false;

    const promptConfig = settings.features.prompts[promptName];
    return promptConfig && typeof promptConfig === 'object' ? promptConfig.enabled : false;
  }

  /**
   * Check if a resource is enabled
   */
  public isResourceEnabled(resourceName: keyof ResourcesConfig): boolean {
    const settings = this.getSettings();
    if (!settings.features.resources.enabled) return false;

    const resourceConfig = settings.features.resources[resourceName];
    return resourceConfig && typeof resourceConfig === 'object' ? resourceConfig.enabled : false;
  }

  /**
   * Get enabled tools list
   */
  public getEnabledTools(): string[] {
    const settings = this.getSettings();
    if (!settings.features.tools.enabled) return [];

    const enabledTools: string[] = [];

    for (const [toolName, toolConfig] of Object.entries(settings.features.tools)) {
      if (toolName !== 'enabled' && toolConfig && (toolConfig as FeatureConfig).enabled) {
        enabledTools.push(toolName);
      }
    }

    return enabledTools;
  }

  /**
   * Get enabled prompts list
   */
  public getEnabledPrompts(): string[] {
    const settings = this.getSettings();
    if (!settings.features.prompts.enabled) return [];

    const enabledPrompts: string[] = [];

    for (const [promptName, promptConfig] of Object.entries(settings.features.prompts)) {
      if (promptName !== 'enabled' && promptConfig && (promptConfig as FeatureConfig).enabled) {
        enabledPrompts.push(promptName);
      }
    }

    return enabledPrompts;
  }

  /**
   * Get enabled resources list
   */
  public getEnabledResources(): string[] {
    const settings = this.getSettings();
    if (!settings.features.resources.enabled) return [];

    const enabledResources: string[] = [];

    for (const [resourceName, resourceConfig] of Object.entries(settings.features.resources)) {
      if (resourceName !== 'enabled' && resourceConfig && (resourceConfig as FeatureConfig).enabled) {
        enabledResources.push(resourceName);
      }
    }

    return enabledResources;
  }

  /**
   * Reload settings from file
   */
  public reloadSettings(): FdaServerSettings {
    this.settings = null;
    return this.loadSettings();
  }

  /**
   * Get settings summary for logging
   */
  public getSettingsSummary(): Record<string, unknown> {
    const settings = this.getSettings();

    return {
      toolsEnabled: settings.features.tools.enabled,
      promptsEnabled: settings.features.prompts.enabled,
      resourcesEnabled: settings.features.resources.enabled,
      enabledToolsCount: this.getEnabledTools().length,
      enabledPromptsCount: this.getEnabledPrompts().length,
      enabledResourcesCount: this.getEnabledResources().length,
      cachingEnabled: settings.caching.enabled,
      debugMode: settings.development.enableDebugMode
    };
  }
}

// Export singleton instance
export const settingsManager = new SettingsManager();