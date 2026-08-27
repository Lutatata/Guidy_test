// 地图页面 - 极简风格
import { useEffect, useRef, useState, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { getGymsForMap, getGymDetail } from '@/api/gyms';
import { getCities } from '@/api/cities';
import type { GymBase, GymDetail, City } from '@/types';

const cityCenters: Record<number, { lat: number; lng: number; zoom: number }> = {
  1: { lat: 31.2304, lng: 121.4737, zoom: 12 }, // 上海
  2: { lat: 39.9042, lng: 116.4074, zoom: 12 }, // 北京
  3: { lat: 22.5431, lng: 114.0579, zoom: 12 }, // 深圳
  4: { lat: 30.2741, lng: 120.1551, zoom: 12 }, // 杭州
  5: { lat: 23.1291, lng: 113.2644, zoom: 12 }, // 广东(其他)
  6: { lat: 23.1291, lng: 113.2644, zoom: 12 }, // 广州
  7: { lat: 30.5728, lng: 104.0668, zoom: 12 }, // 成都
  8: { lat: 29.1416, lng: 119.7889, zoom: 12 }, // 浙江(其他)
  9: { lat: 29.5630, lng: 106.5516, zoom: 12 }, // 重庆
  10: { lat: 36.6512, lng: 117.1201, zoom: 12 }, // 山东(其他)
};

export default function MapPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);

  const cityParam = searchParams.get('city');
  const [cityId, setCityId] = useState<number>(cityParam ? parseInt(cityParam) : 1);
  const [cityName, setCityName] = useState('加载中...');
  const [gyms, setGyms] = useState<GymBase[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCityDrawer, setShowCityDrawer] = useState(false);
  const [selectedGym, setSelectedGym] = useState<GymBase | null>(null);
  const [selectedGymDetail, setSelectedGymDetail] = useState<GymDetail | null>(null);
  const [keyword, setKeyword] = useState('');

  useEffect(() => {
    waitForAMapAndLoad();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const waitForAMapAndLoad = () => {
    const checkAMap = () => {
      if ((window as any).AMap) {
        loadData();
      } else {
        setTimeout(checkAMap, 100);
      }
    };
    checkAMap();
  };

  useEffect(() => {
    if (!mapInstanceRef.current) return;
    const center = cityCenters[cityId] || { lat: 35.8617, lng: 104.1954, zoom: 5 };
    mapInstanceRef.current.setZoomAndCenter(center.zoom, [center.lng, center.lat]);
    setTimeout(() => {
      mapInstanceRef.current?.resize();
      loadGyms(cityId);
    }, 300);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cityId]);

  const loadData = async () => {
    try {
      const [gymsData, citiesData] = await Promise.all([
        getGymsForMap(cityId),
        getCities(),
      ]);
      setCities(citiesData);
      setCityName(citiesData.find(c => c.id === cityId)?.name || '全国');
      const validGyms = gymsData.filter(g => g.latitude && g.longitude);
      setGyms(validGyms);
      setTimeout(() => {
        initMap(validGyms);
      }, 200);
    } catch (error) {
      console.error('加载数据失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadGyms = async (cid: number) => {
    try {
      const data = await getGymsForMap(cid);
      const validGyms = data.filter(g => g.latitude && g.longitude);
      setGyms(validGyms);
      markersRef.current.forEach(m => mapInstanceRef.current?.remove(m));
      markersRef.current = [];
      addMarkers(validGyms);
    } catch (error) {
      console.error('加载岩馆失败:', error);
    }
  };

  const initMap = (gymData: GymBase[]) => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const AMapObj = (window as any).AMap;
    if (!AMapObj) {
      console.error('高德地图 SDK 未加载');
      return;
    }

    const center = cityCenters[cityId] || { lat: 31.2304, lng: 121.4737, zoom: 12 };

    const map = new AMapObj.Map(mapContainerRef.current, {
      zoom: center.zoom,
      center: [center.lng, center.lat],
      viewMode: 'mobile',
      features: ['bg', 'road', 'building', 'point'],
      mapStyle: 'amap://styles/normal',
    });

    mapInstanceRef.current = map;

    map.on('complete', () => {
      addMarkers(gymData);
    });

    map.on('click', () => {
      console.log('Map clicked, clearing selection');
      setSelectedGym(null);
      setSelectedGymDetail(null);
    });

    addMarkers(gymData);
  };

  const addMarkers = (gymData: GymBase[]) => {
    const AMapObj = (window as any).AMap;
    if (!AMapObj || !mapInstanceRef.current) return;

    gymData.forEach((gym) => {
      if (!gym.latitude || !gym.longitude) return;

      try {
        const displayName = gym.short_name || gym.name.slice(0, 1);
        const isBanana = gym.name.includes('香蕉') || gym.name.toUpperCase().includes('BANANA');
        const bgColor = isBanana ? '#FFD400' : '#f97316';
        const textColor = isBanana ? '#1a1a1a' : 'white';
        const borderColor = isBanana ? '#FFC300' : 'white';
        const zIndex = isBanana ? 300 : 200;
        
        const markerId = `marker-${gym.id}`;
        const markerContent = `
          <div id="${markerId}" style="position:relative;transform:translate(-50%,-100%);cursor:pointer;">
            <div style="width:${isBanana ? '36px' : '32px'};height:${isBanana ? '36px' : '32px'};background:${bgColor};border-radius:50%;display:flex;align-items:center;justify-content:center;color:${textColor};font-weight:${isBanana ? '800' : '700'};font-size:${isBanana ? '14px' : '13px'};box-shadow:${isBanana ? '0 3px 12px rgba(255,212,0,0.5)' : '0 2px 8px rgba(0,0,0,0.25)'};border:2px solid ${borderColor};">${isBanana ? '香' : displayName}</div>
          </div>`;

        const marker = new AMapObj.Marker({
          position: [gym.longitude, gym.latitude],
          map: mapInstanceRef.current,
          offset: new AMapObj.Pixel(0, 0),
          content: markerContent,
          zIndex: zIndex,
          clickable: true,
        });

        marker.on('click', () => {
          console.log('Marker clicked:', gym.name);
          setSelectedGym(gym);
          getGymDetail(gym.id)
            .then(detail => setSelectedGymDetail(detail))
            .catch(err => {
              console.error('获取岩馆详情失败:', err);
              setSelectedGymDetail(null);
            });
        });

        // 同时绑定到DOM元素上作为备选
        setTimeout(() => {
          const el = document.getElementById(markerId);
          if (el) {
            el.addEventListener('click', (e) => {
              e.stopPropagation();
              console.log('Marker DOM clicked:', gym.name);
              setSelectedGym(gym);
              getGymDetail(gym.id)
                .then(detail => setSelectedGymDetail(detail))
                .catch(err => {
                  console.error('获取岩馆详情失败:', err);
                  setSelectedGymDetail(null);
                });
            });
          }
        }, 100);

        markersRef.current.push(marker);
      } catch (e) {
        console.error('添加标记失败:', gym.name, e);
      }
    });
  };

  const selectCity = useCallback((id: number, name: string) => {
    setCityId(id);
    setCityName(name);
    setShowCityDrawer(false);
    setSelectedGym(null);
  }, []);

  const goToDetail = (gym: GymBase) => {
    navigate(`/gym/${gym.id}`);
  };

  const zoomIn = () => {
    mapInstanceRef.current?.zoomIn();
  };

  const zoomOut = () => {
    mapInstanceRef.current?.zoomOut();
  };

  const locate = () => {
    if (cityCenters[cityId]) {
      const center = cityCenters[cityId];
      mapInstanceRef.current?.setZoomAndCenter(center.zoom, [center.lng, center.lat]);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-screen text-gray-500">加载中...</div>;
  }

  return (
    <div className="relative w-full h-full flex flex-col bg-gray-50 overflow-hidden">
      {/* 地图区域 */}
      <div className="flex-1 relative min-h-0">
        <div ref={mapContainerRef} className="absolute inset-0" onClick={() => setSelectedGym(null)} />

        {/* 顶部通知按钮 */}
        <div className="absolute top-0 right-0 z-50 px-4 pt-3 pointer-events-none">
          <button className="w-10 h-10 bg-white rounded-full shadow-md flex items-center justify-center pointer-events-auto">
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
          </button>
        </div>

        {/* 地图右下角控制按钮 */}
        <div className="absolute right-3 bottom-[140px] flex flex-col gap-2 z-40">
          <button onClick={zoomIn} className="w-10 h-10 bg-white rounded-full shadow-md flex items-center justify-center text-xl text-gray-700">
            +
          </button>
          <button onClick={zoomOut} className="w-10 h-10 bg-white rounded-full shadow-md flex items-center justify-center text-xl text-gray-700">
            −
          </button>
          <button onClick={locate} className="w-10 h-10 bg-white rounded-full shadow-md flex items-center justify-center">
            <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" />
              <circle cx="12" cy="9" r="2.5" />
            </svg>
          </button>
          <button className="w-10 h-10 bg-white rounded-full shadow-md flex items-center justify-center">
            <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
            </svg>
          </button>
        </div>

        {/* 悬浮卡片 - 选中岩馆时显示 */}
        {selectedGym && (
          <div className="absolute bottom-[130px] left-3 right-3 z-50 animate-slide-up">
            <div onClick={(e) => e.stopPropagation()} className="bg-white rounded-2xl shadow-2xl overflow-hidden">
              {/* 拖拽手柄 */}
              <div className="flex justify-center pt-3 pb-1">
                <div className="w-10 h-1.5 bg-gray-300 rounded-full"></div>
              </div>

              {/* 卡片内容 */}
              <div className="px-4 pb-4 pt-2">
                {/* 头部：图片 + 名称 */}
                <div className="flex gap-3">
                  {/* 左侧图片 */}
                  <div className="w-20 h-20 rounded-xl bg-gradient-to-br from-amber-700 to-amber-900 flex-shrink-0 relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent"></div>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <svg className="w-10 h-10 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 20l4-8 3 6 2-4 4 6H3z" />
                        <circle cx="8.5" cy="7" r="2" strokeWidth={1.5} />
                      </svg>
                    </div>
                  </div>

                  {/* 右侧信息 */}
                  <div className="flex-1 min-w-0 flex items-start">
                    <div className="flex-1 min-w-0">
                      <h2 className="text-lg font-bold text-gray-900 truncate">
                        {selectedGym.name}
                      </h2>
                      
                      {/* 标签 */}
                      <div className="flex flex-wrap gap-1 mt-1">
                        {selectedGymDetail?.climb_type ? (
                          <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full">
                            {selectedGymDetail.climb_type}
                          </span>
                        ) : (
                          <>
                            <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full">抱石</span>
                            <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full">难度墙</span>
                          </>
                        )}
                        <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full">自动保护</span>
                      </div>

                      {/* 距离 + 状态 */}
                      <div className="flex items-center gap-3 mt-2">
                        <span className="text-sm text-orange-500 font-semibold">
                          距你 380m
                        </span>
                        <span className="text-xs px-2 py-0.5 bg-green-50 text-green-600 rounded-full flex items-center gap-1">
                          <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
                          {selectedGym.status === 'active' ? '营业中' : '已关闭'}
                        </span>
                      </div>
                    </div>

                    {/* 爱心收藏按钮 */}
                    <button className="p-2 text-gray-400 hover:text-red-500 flex-shrink-0 transition-colors">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                      </svg>
                    </button>
                  </div>
                </div>

                {/* 分隔线 */}
                <div className="border-t border-gray-100 my-3"></div>

                {/* 详细信息 */}
                <div className="space-y-2.5">
                  {/* 地址 */}
                  <div className="flex items-start gap-2 text-sm">
                    <svg className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <span className="text-gray-700">{selectedGymDetail?.address || '地址暂未提供'}</span>
                  </div>

                  {/* 电话 */}
                  <div className="flex items-center gap-2 text-sm">
                    <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                    <span className="text-gray-700">{selectedGymDetail?.phone || '电话暂未提供'}</span>
                  </div>

                  {/* 营业时间 */}
                  <div className="flex items-center gap-2 text-sm">
                    <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-gray-700">
                      营业时间：{selectedGymDetail?.opening_hours?.weekday || '暂未提供'}
                    </span>
                  </div>

                  {/* 评分 */}
                  {selectedGymDetail?.rating && (
                    <div className="flex items-center gap-2 text-sm">
                      <svg className="w-4 h-4 text-yellow-400 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                      </svg>
                      <span className="text-gray-700 font-medium">{selectedGymDetail.rating}</span>
                      <span className="text-gray-400">· {selectedGymDetail.favorites}收藏</span>
                    </div>
                  )}
                </div>

                {/* 导航按钮 */}
                <button
                  onClick={() => goToDetail(selectedGym)}
                  className="w-full mt-4 bg-black text-white py-3.5 rounded-2xl font-semibold flex items-center justify-center gap-2 hover:bg-gray-800 transition-colors active:scale-[0.98]"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                  </svg>
                  导航到这里去
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 底部区域：搜索栏 + Tab导航 */}
      <div className="bg-white border-t border-gray-100 shadow-lg relative z-30">
        {/* 搜索栏 + 城市切换 */}
        <div className="flex items-center gap-2 mx-4 mt-3 mb-2">
          <div className="flex items-center gap-2 bg-gray-100 rounded-full flex-1 px-4 py-2.5">
            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="搜索攀岩馆、区域或路线"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              className="flex-1 bg-transparent outline-none text-sm text-gray-700 placeholder-gray-400"
            />
          </div>
          <button
            onClick={() => setShowCityDrawer(true)}
            className="flex items-center gap-1 bg-gray-100 rounded-full px-3 py-2.5 text-sm text-gray-700 flex-shrink-0"
          >
            <svg className="w-4 h-4 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a2 2 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span className="font-medium">{cityName}</span>
            <span className="text-xs text-gray-400">▾</span>
          </button>
        </div>

        {/* Tab 导航 */}
        <div className="flex items-center justify-around px-2 pb-2 pt-1 border-t border-gray-50">
          <button className="flex flex-col items-center gap-0.5 py-1.5 px-4">
            <svg className="w-6 h-6 text-orange-500" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 010-5 2.5 2.5 0 010 5z" />
            </svg>
            <span className="text-[10px] text-orange-500 font-medium">地图</span>
          </button>
          <button className="flex flex-col items-center gap-0.5 py-1.5 px-4">
            <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <span className="text-[10px] text-gray-400">发现</span>
          </button>
          <button className="flex flex-col items-center gap-0.5 py-1.5 px-4">
            <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span className="text-[10px] text-gray-400">计划</span>
          </button>
          <button className="flex flex-col items-center gap-0.5 py-1.5 px-4">
            <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <span className="text-[10px] text-gray-400">我的</span>
          </button>
        </div>
      </div>

      {/* 城市选择抽屉 */}
      {showCityDrawer && (
        <div className="fixed inset-0 z-50 flex items-end" onClick={() => setShowCityDrawer(false)}>
          <div className="absolute inset-0 bg-black/40" />
          <div
            className="relative w-full bg-white rounded-t-2xl max-h-[70vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="font-bold text-lg">选择城市</h2>
              <button onClick={() => setShowCityDrawer(false)} className="text-gray-400 text-2xl">×</button>
            </div>
            <div className="overflow-y-auto max-h-[50vh]">
              <div className="p-4">
                <h3 className="text-sm text-gray-500 mb-2">热门城市</h3>
                <div className="grid grid-cols-3 gap-2">
                  {cities.slice(0, 6).map((c) => (
                    <button
                      key={c.id}
                      onClick={() => selectCity(c.id, c.name)}
                      className={`py-3 rounded-lg text-sm ${
                        c.id === cityId
                          ? 'bg-orange-500 text-white'
                          : 'bg-gray-50 text-gray-700'
                      }`}
                    >
                      {c.name}
                      <div className="text-xs opacity-75">{c.gym_count}家</div>
                    </button>
                  ))}
                </div>
              </div>
              <div className="p-4 pt-0">
                <h3 className="text-sm text-gray-500 mb-2">全部城市</h3>
                <div className="space-y-1">
                  {cities.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => selectCity(c.id, c.name)}
                      className={`w-full text-left px-3 py-3 rounded-lg flex justify-between items-center ${
                        c.id === cityId
                          ? 'bg-orange-50 text-orange-600'
                          : 'text-gray-700'
                      }`}
                    >
                      <span>{c.name}</span>
                      <span className="text-sm text-gray-400">{c.gym_count} 家岩馆</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
