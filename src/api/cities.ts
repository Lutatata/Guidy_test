// 城市 API - 支持双模式
import client from './client';
import type { City } from '@/types';

const useApi = import.meta.env.VITE_USE_API === 'true';

/**
 * 获取所有城市列表
 */
export const getCities = async (): Promise<City[]> => {
  if (useApi) {
    // API 模式
    const response = await client.get('/cities');
    return response as unknown as City[];
  } else {
    // 静态 JSON 模式
    const response = await client.get('data/cities.json');
    return response as unknown as City[];
  }
};

/**
 * 获取指定城市岩馆数量
 */
export const getCityGymCount = async (cityId: number): Promise<{ city_id: number; gym_count: number }> => {
  if (useApi) {
    // API 模式
    const response = await client.get(`/cities/${cityId}/gyms`);
    return response as unknown as { city_id: number; gym_count: number };
  } else {
    // 静态 JSON 模式 - 简单计数
    const response = await client.get(`data/gyms-city-${cityId}.json`);
    const gyms = response as unknown as Array<{ city_id: number }>;
    return { city_id: cityId, gym_count: gyms.length };
  }
};
