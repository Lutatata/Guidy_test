// 类型定义

// 城市
export interface City {
  id: number;
  name: string;
  gym_count: number;
}

// 岩馆基础信息（地图标记用）
export interface GymBase {
  id: string;
  name: string;
  short_name: string | null;
  city_id: number;
  latitude: number | null;
  longitude: number | null;
  status: string;
  is_red_dot?: boolean;
}

// 岩馆列表项
export interface GymListOut {
  id: string;
  name: string;
  city_id: number;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  day_ticket: number | null;
  climb_type: string | null;
  rating: number | null;
}

// 营业时间
export interface OpeningHours {
  weekday?: string;
  weekend?: string;
}

// 岩馆详情
export interface GymDetail {
  id: string;
  name: string;
  city_id: number;
  address: string | null;
  phone: string | null;
  status: string;
  latitude: number | null;
  longitude: number | null;
  opening_hours: OpeningHours | null;
  day_ticket: number | null;
  month_card: number | null;
  year_card: number | null;
  climb_type: string | null;
  facility_count: number | null;
  boulder_routes: number | null;
  sport_routes: number | null;
  area: number | null;
  route_change_cycle: string | null;
  route_setter: string | null;
  rating: number | null;
  likes: number;
  favorites: number;
  views: number;
  has_description: boolean;
  description: string | null;
}
