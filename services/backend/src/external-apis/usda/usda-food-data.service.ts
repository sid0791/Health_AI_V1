import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom, retry, catchError } from 'rxjs';
import { AxiosResponse } from 'axios';

export interface UsdaFoodSearchParams {
  query: string;
  dataType?: ('Branded' | 'SR Legacy' | 'Survey (FNDDS)')[];
  pageSize?: number;
  pageNumber?: number;
  sortBy?: 'dataType.keyword' | 'lowercaseDescription.keyword' | 'fdcId' | 'publishedDate';
  sortOrder?: 'asc' | 'desc';
  brandOwner?: string;
}

export interface UsdaFoodSearchResult {
  totalHits: number;
  currentPage: number;
  totalPages: number;
  pageList: number[];
  foodSearchCriteria: {
    query: string;
    dataType: string[];
    pageSize: number;
    pageNumber: number;
    sortBy: string;
    sortOrder: string;
  };
  foods: UsdaFood[];
}

export interface UsdaFood {
  fdcId: number;
  description: string;
  lowercaseDescription: string;
  dataType: string;
  gtinUpc?: string;
  publishedDate: string;
  brandOwner?: string;
  brandName?: string;
  ingredients?: string;
  marketCountry?: string;
  foodCategory?: string;
  modifiedDate?: string;
  dataSource?: string;
  packageWeight?: string;
  servingSize?: number;
  servingSizeUnit?: string;
  householdServingFullText?: string;
  allHighlightFields?: string;
  score?: number;
  foodNutrients?: UsdaFoodNutrient[];
}

export interface UsdaFoodNutrient {
  nutrientId: number;
  nutrientName: string;
  nutrientNumber: string;
  unitName: string;
  derivationCode?: string;
  derivationDescription?: string;
  derivationId?: number;
  value: number;
  foodNutrientSourceId?: number;
  foodNutrientSourceCode?: string;
  foodNutrientSourceDescription?: string;
  rank?: number;
  indentLevel?: number;
  foodNutrientId?: number;
  percentDailyValue?: number;
}

export interface UsdaFoodDetails extends UsdaFood {
  foodCode?: string;
  foodNutrients: UsdaFoodNutrient[];
  foodAttributes?: Array<{
    id: number;
    name: string;
    value: string;
  }>;
  nutrientConversionFactors?: Array<{
    type: string;
    value: number;
  }>;
  isHistoricalReference?: boolean;
  ndbNumber?: string;
  inputFoods?: Array<{
    id: number;
    unit: string;
    portionCode: string;
    portionDescription: string;
    gramWeight: number;
    sequenceNumber: number;
    amount: number;
  }>;
  wweiaFoodCategory?: {
    wweiaFoodCategoryCode: number;
    wweiaFoodCategoryDescription: string;
  };
  changes?: string;
  foodPortions?: Array<{
    id: number;
    measureUnit: {
      id: number;
      name: string;
      abbreviation: string;
    };
    modifier: string;
    gramWeight: number;
    sequenceNumber: number;
  }>;
}

@Injectable()
export class UsdaFoodDataService {
  private readonly logger = new Logger(UsdaFoodDataService.name);
  private readonly baseUrl = 'https://api.nal.usda.gov/fdc/v1';
  private readonly apiKey: string;
  private readonly defaultTimeout = 10000; // 10 seconds
  private readonly maxRetries = 3;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.apiKey = this.configService.get<string>('USDA_API_KEY') || 'DEMO_KEY';

    if (this.apiKey === 'DEMO_KEY') {
      this.logger.warn(
        'Using DEMO_KEY for USDA API. This has strict rate limits. Set USDA_API_KEY environment variable for production use.',
      );
    }
  }

  /**
   * Search for foods in the USDA FoodData Central database
   * @param params Search parameters
   * @returns Promise<UsdaFoodSearchResult>
   */
  async searchFoods(params: UsdaFoodSearchParams): Promise<UsdaFoodSearchResult> {
    const {
      query,
      dataType = ['Branded', 'SR Legacy', 'Survey (FNDDS)'],
      pageSize = 50,
      pageNumber = 1,
      sortBy = 'dataType.keyword',
      sortOrder = 'asc',
      brandOwner,
    } = params;

    if (!query || query.trim().length === 0) {
      throw new HttpException('Search query is required', HttpStatus.BAD_REQUEST);
    }

    if (pageSize > 200) {
      throw new HttpException('Page size cannot exceed 200', HttpStatus.BAD_REQUEST);
    }

    const requestBody = {
      query: query.trim(),
      dataType,
      pageSize: Math.min(pageSize, 200),
      pageNumber: Math.max(pageNumber, 1),
      sortBy,
      sortOrder,
      ...(brandOwner && { brandOwner }),
    };

    try {
      this.logger.debug(`Searching USDA foods with query: "${query}"`);

      const response: AxiosResponse<UsdaFoodSearchResult> = await firstValueFrom(
        this.httpService
          .post<UsdaFoodSearchResult>(`${this.baseUrl}/foods/search`, requestBody, {
            params: { api_key: this.apiKey },
            timeout: this.defaultTimeout,
            headers: {
              'Content-Type': 'application/json',
              'User-Agent': 'HealthCoachAI/1.0',
            },
          })
          .pipe(
            retry({
              count: this.maxRetries,
              delay: (error, retryCount) => {
                const delay = Math.min(1000 * Math.pow(2, retryCount - 1), 10000);
                this.logger.warn(
                  `USDA API request failed, retrying in ${delay}ms (attempt ${retryCount}/${this.maxRetries})`,
                  error.message,
                );
                return new Promise((resolve) => setTimeout(resolve, delay));
              },
            }),
            catchError((error) => {
              this.logger.error('USDA API search failed after all retries', error);
              throw this.handleApiError(error);
            }),
          ),
      );

      this.logger.debug(`USDA search returned ${response.data.foods.length} foods`);
      return response.data;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        'Failed to search USDA food database',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Get detailed information about a specific food item
   * @param fdcId The FDC ID of the food item
   * @param nutrients Optional list of nutrient numbers to include
   * @returns Promise<UsdaFoodDetails>
   */
  async getFoodDetails(fdcId: number, nutrients?: string[]): Promise<UsdaFoodDetails> {
    if (!fdcId || fdcId <= 0) {
      throw new HttpException('Valid FDC ID is required', HttpStatus.BAD_REQUEST);
    }

    const params: any = { api_key: this.apiKey };
    if (nutrients && nutrients.length > 0) {
      params.nutrients = nutrients.join(',');
    }

    try {
      this.logger.debug(`Fetching USDA food details for FDC ID: ${fdcId}`);

      const response: AxiosResponse<UsdaFoodDetails> = await firstValueFrom(
        this.httpService
          .get<UsdaFoodDetails>(`${this.baseUrl}/food/${fdcId}`, {
            params,
            timeout: this.defaultTimeout,
            headers: {
              'User-Agent': 'HealthCoachAI/1.0',
            },
          })
          .pipe(
            retry({
              count: this.maxRetries,
              delay: (error, retryCount) => {
                const delay = Math.min(1000 * Math.pow(2, retryCount - 1), 10000);
                this.logger.warn(
                  `USDA API request failed, retrying in ${delay}ms (attempt ${retryCount}/${this.maxRetries})`,
                  error.message,
                );
                return new Promise((resolve) => setTimeout(resolve, delay));
              },
            }),
            catchError((error) => {
              this.logger.error(`USDA API food details failed for FDC ID ${fdcId}`, error);
              throw this.handleApiError(error);
            }),
          ),
      );

      this.logger.debug(`USDA food details retrieved for FDC ID: ${fdcId}`);
      return response.data;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        `Failed to get food details for FDC ID ${fdcId}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Get details for multiple foods at once
   * @param fdcIds Array of FDC IDs
   * @param nutrients Optional list of nutrient numbers to include
   * @returns Promise<UsdaFoodDetails[]>
   */
  async getMultipleFoodDetails(fdcIds: number[], nutrients?: string[]): Promise<UsdaFoodDetails[]> {
    if (!fdcIds || fdcIds.length === 0) {
      throw new HttpException('At least one FDC ID is required', HttpStatus.BAD_REQUEST);
    }

    if (fdcIds.length > 20) {
      throw new HttpException('Cannot request more than 20 foods at once', HttpStatus.BAD_REQUEST);
    }

    const requestBody: any = { fdcIds };
    if (nutrients && nutrients.length > 0) {
      requestBody.nutrients = nutrients;
    }

    try {
      this.logger.debug(`Fetching USDA food details for ${fdcIds.length} foods`);

      const response: AxiosResponse<UsdaFoodDetails[]> = await firstValueFrom(
        this.httpService
          .post<UsdaFoodDetails[]>(`${this.baseUrl}/foods`, requestBody, {
            params: { api_key: this.apiKey },
            timeout: this.defaultTimeout,
            headers: {
              'Content-Type': 'application/json',
              'User-Agent': 'HealthCoachAI/1.0',
            },
          })
          .pipe(
            retry({
              count: this.maxRetries,
              delay: (error, retryCount) => {
                const delay = Math.min(1000 * Math.pow(2, retryCount - 1), 10000);
                this.logger.warn(
                  `USDA API request failed, retrying in ${delay}ms (attempt ${retryCount}/${this.maxRetries})`,
                  error.message,
                );
                return new Promise((resolve) => setTimeout(resolve, delay));
              },
            }),
            catchError((error) => {
              this.logger.error('USDA API multiple foods request failed', error);
              throw this.handleApiError(error);
            }),
          ),
      );

      this.logger.debug(`USDA multiple food details retrieved for ${response.data.length} foods`);
      return response.data;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        'Failed to get multiple food details',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Get nutrient information by nutrient number
   * @param nutrientNumber The nutrient number (e.g., "208" for Energy)
   * @returns Promise with nutrient details
   */
  async getNutrientInfo(nutrientNumber: string): Promise<any> {
    if (!nutrientNumber) {
      throw new HttpException('Nutrient number is required', HttpStatus.BAD_REQUEST);
    }

    try {
      this.logger.debug(`Fetching USDA nutrient info for: ${nutrientNumber}`);

      const response: AxiosResponse<any> = await firstValueFrom(
        this.httpService
          .get(`${this.baseUrl}/nutrient/${nutrientNumber}`, {
            params: { api_key: this.apiKey },
            timeout: this.defaultTimeout,
            headers: {
              'User-Agent': 'HealthCoachAI/1.0',
            },
          })
          .pipe(
            retry({
              count: this.maxRetries,
              delay: (error, retryCount) => {
                const delay = Math.min(1000 * Math.pow(2, retryCount - 1), 10000);
                this.logger.warn(
                  `USDA API request failed, retrying in ${delay}ms (attempt ${retryCount}/${this.maxRetries})`,
                  error.message,
                );
                return new Promise((resolve) => setTimeout(resolve, delay));
              },
            }),
            catchError((error) => {
              this.logger.error(`USDA API nutrient info failed for ${nutrientNumber}`, error);
              throw this.handleApiError(error);
            }),
          ),
      );

      this.logger.debug(`USDA nutrient info retrieved for: ${nutrientNumber}`);
      return response.data;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        `Failed to get nutrient info for ${nutrientNumber}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Check if the service is available and API key is valid
   * @returns Promise<boolean>
   */
  async healthCheck(): Promise<boolean> {
    try {
      await this.searchFoods({ query: 'apple', pageSize: 1 });
      return true;
    } catch (error) {
      this.logger.error('USDA API health check failed', error);
      return false;
    }
  }

  /**
   * Get API usage information if available
   * @returns Promise with usage stats
   */
  async getApiUsage(): Promise<any> {
    this.logger.debug('USDA API does not provide usage statistics endpoint');
    return {
      message: 'USDA FoodData Central API does not provide usage statistics',
      recommendations: [
        'Monitor your API calls manually',
        'Consider caching frequently requested data',
        'Use appropriate page sizes to minimize API calls',
      ],
    };
  }

  private handleApiError(error: any): HttpException {
    if (error.response) {
      const status = error.response.status;
      const message = error.response.data?.message || error.response.statusText;

      switch (status) {
        case 400:
          return new HttpException(`Bad request to USDA API: ${message}`, HttpStatus.BAD_REQUEST);
        case 401:
          return new HttpException('Invalid USDA API key', HttpStatus.UNAUTHORIZED);
        case 403:
          return new HttpException(
            'USDA API access forbidden - check API key permissions',
            HttpStatus.FORBIDDEN,
          );
        case 404:
          return new HttpException(
            'Requested food not found in USDA database',
            HttpStatus.NOT_FOUND,
          );
        case 429:
          return new HttpException('USDA API rate limit exceeded', HttpStatus.TOO_MANY_REQUESTS);
        case 500:
        case 502:
        case 503:
        case 504:
          return new HttpException('USDA API service unavailable', HttpStatus.SERVICE_UNAVAILABLE);
        default:
          return new HttpException(`USDA API error: ${message}`, HttpStatus.INTERNAL_SERVER_ERROR);
      }
    }

    if (error.code === 'ECONNABORTED') {
      return new HttpException('USDA API request timeout', HttpStatus.REQUEST_TIMEOUT);
    }

    return new HttpException('Failed to connect to USDA API', HttpStatus.INTERNAL_SERVER_ERROR);
  }
}
