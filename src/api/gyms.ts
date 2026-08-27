// 岩馆 API - 支持双模式
import client from './client';
import type { GymBase, GymDetail, GymListOut } from '@/types';

const useApi = import.meta.env.VITE_USE_API === 'true';

/**
 * 获取岩馆列表
 */
export const getGyms = async (params?: {
  city_id?: number;
  keyword?: string;
  limit?: number;
  offset?: number;
}): Promise<GymListOut[]> => {
  if (useApi) {
    // API 模式
    const response = await client.get('/gyms', { params });
    return response as unknown as GymListOut[];
  } else {
    // 静态 JSON 模式
    const gyms = await getGymsForMap(params?.city_id);
    let result = gyms as unknown as GymListOut[];

    if (params?.keyword) {
      const kw = params.keyword.toLowerCase();
      result = result.filter(g => g.name.toLowerCase().includes(kw));
    }

    if (params?.limit) {
      const offset = params.offset || 0;
      result = result.slice(offset, offset + params.limit);
    }

    return result;
  }
};

/**
 * 获取地图标记数据
 */
export const getGymsForMap = async (city_id?: number): Promise<GymBase[]> => {
  if (useApi) {
    // API 模式
    const response = await client.get('/gyms/map', { params: city_id ? { city_id } : {} });
    return response as unknown as GymBase[];
  } else {
    // 静态 JSON 模式
    if (city_id) {
      const response = await client.get(`data/gyms-city-${city_id}.json`);
      return response as unknown as GymBase[];
    }
    const response = await client.get('data/gyms-map.json');
    return response as unknown as GymBase[];
  }
};

/**
 * 获取岩馆详情
 */
export const getGymDetail = async (id: string): Promise<GymDetail> => {
  if (useApi) {
    // API 模式
    const response = await client.get(`/gyms/${id}`);
    return response as unknown as GymDetail;
  } else {
    // 静态 JSON 模式
    const response = await client.get('data/gyms-detail.json');
    const details = response as unknown as Record<string, GymDetail>;
    const detail = details[id];
    if (!detail) {
      throw new Error(`Gym ${id} not found`);
    }
    return detail;
  }
};

/**
 * 按坐标搜索附近岩馆
 */
export const getNearbyGyms = async (params: {
  lat: number;
  lng: number;
  radius?: number;
  limit?: number;
}): Promise<GymListOut[]> => {
  if (useApi) {
    // API 模式
    const response = await client.get('/gyms/nearby/list', { params });
    return response as unknown as GymListOut[];
  } else {
    // 静态 JSON 模式 - 简单距离排序
    const response = await client.get('data/gyms-map.json');
    const allGyms = response as unknown as GymBase[];

    const withDistance = allGyms
      .filter(g => g.latitude && g.longitude)
      .map(g => ({
        ...g,
        distance: Math.sqrt(
          Math.pow((g.latitude! - params.lat) * 111, 2) +
          Math.pow((g.longitude! - params.lng) * 111, 2)
        ),
      }))
      .sort((a, b) => (a as any).distance - (b as any).distance);

    const limit = params.limit || 20;
    return withDistance.slice(0, limit) as unknown as GymListOut[];
  }
};
