import axios from 'axios';

export class OpenDotaService {
  private static apiKey = process.env.OPENDOTA_API_KEY;
  private static baseURL = 'https://api.opendota.com/api';

  // Проверка доступности OpenDota API
  static async isAvailable(): Promise<boolean> {
    try {
      const response = await axios.get(`${this.baseURL}/status`, {
        timeout: 5000
      });
      return response.status === 200;
    } catch (error) {
      console.error('OpenDota API unavailable:', error);
      return false;
    }
  }

  // Получение основных данных игрока
  static async getPlayerData(steamId: string) {
    try {
      console.log(`📊 Fetching OpenDota data for: ${steamId}`);
      
      const headers = this.apiKey ? { 'Authorization': `Bearer ${this.apiKey}` } : {};
      
      const response = await axios.get(`${this.baseURL}/players/${steamId}`, {
        headers,
        timeout: 15000
      });

      console.log(`✅ OpenDota API response received`);
      return {
        success: true,
        data: response.data,
        status: response.status
      };
    } catch (error: any) {
      console.error('❌ OpenDota API error:', error.response?.status, error.message);
      
      return {
        success: false,
        error: error.message,
        status: error.response?.status,
        data: null
      };
    }
  }

  // Получение количества матчей
  static async getTotalMatches(steamId: string) {
    try {
      const headers = this.apiKey ? { 'Authorization': `Bearer ${this.apiKey}` } : {};
      
      const response = await axios.get(`${this.baseURL}/players/${steamId}/counts`, {
        headers,
        timeout: 10000
      });

      const totalMatches = response.data.total_matches || 0;
      console.log(`🎮 OpenDota total matches: ${totalMatches}`);
      
      return {
        success: true,
        totalMatches
      };
    } catch (error: any) {
      console.error('OpenDota matches error:', error.message);
      return {
        success: false,
        totalMatches: 0,
        error: error.message
      };
    }
  }

  // Получение истории матчей
  static async getMatchHistory(steamId: string, limit: number = 10) {
    try {
      const headers = this.apiKey ? { 'Authorization': `Bearer ${this.apiKey}` } : {};
      
      const response = await axios.get(`${this.baseURL}/players/${steamId}/matches`, {
        headers,
        params: { limit },
        timeout: 10000
      });

      console.log(`📈 OpenDota matches fetched: ${response.data.length}`);
      
      return {
        success: true,
        matches: response.data
      };
    } catch (error: any) {
      console.error('OpenDota match history error:', error.message);
      return {
        success: false,
        matches: [],
        error: error.message
      };
    }
  }

  // Принудительное обновление данных игрока
  static async refreshPlayerData(steamId: string) {
    try {
      const headers = this.apiKey ? { 'Authorization': `Bearer ${this.apiKey}` } : {};
      
      console.log(`🔄 Refreshing OpenDota data for: ${steamId}`);
      
      const response = await axios.post(
        `${this.baseURL}/players/${steamId}/refresh`,
        {},
        {
          headers,
          timeout: 30000
        }
      );

      console.log(`✅ OpenDota refresh initiated:`, response.data);
      
      return {
        success: true,
        data: response.data
      };
    } catch (error: any) {
      console.error('OpenDota refresh error:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }
}
