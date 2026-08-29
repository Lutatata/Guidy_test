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
  const markerClickedRef = useRef(false);
  const userLocationMarkerRef = useRef<any>(null);
  const userLocationCircleRef = useRef<any>(null);
  const cityChangedByLocationRef = useRef(false);
  const citiesRef = useRef<City[]>([]);

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
  const [userLocation, setUserLocation] = useState<{ lng: number; lat: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const touchStartYRef = useRef(0);
  const [playingVideoIndex, setPlayingVideoIndex] = useState<number | null>(null);
  const touchStartXRef = useRef(0);

  // 导航相关状态
  const [showNavigation, setShowNavigation] = useState(false);
  const [navMode, setNavMode] = useState<'driving' | 'walking' | 'transit'>('driving');
  const [routeInfo, setRouteInfo] = useState<{ distance: string; time: string } | null>(null);
  const [navigating, setNavigating] = useState(false);
  const routePolylineRef = useRef<any>(null);
  const routeStartMarkerRef = useRef<any>(null);
  const routeEndMarkerRef = useRef<any>(null);
  const showNavigationRef = useRef(false);
  const navDestinationRef = useRef<{ lng: number; lat: number } | null>(null);

  useEffect(() => {
    waitForAMapAndLoad();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 切换岩馆时暂停所有视频并重置播放状态
  useEffect(() => {
    if (!selectedGym) return;
    document.querySelectorAll('video').forEach((v) => v.pause());
    setPlayingVideoIndex(null);
  }, [selectedGym]);

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

    if (cityChangedByLocationRef.current) {
      // 定位匹配城市：只加载岩馆，不移动地图中心（保留用户定位位置）
      cityChangedByLocationRef.current = false;
      loadGyms(cityId);
    } else {
      // 正常城市切换：移动地图中心 + 加载岩馆
      const center = cityCenters[cityId] || { lat: 35.8617, lng: 104.1954, zoom: 5 };
      mapInstanceRef.current.setZoomAndCenter(center.zoom, [center.lng, center.lat]);
      setTimeout(() => {
        mapInstanceRef.current?.resize();
        loadGyms(cityId);
      }, 300);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cityId]);

  const loadData = async () => {
    try {
      const [gymsData, citiesData] = await Promise.all([
        getGymsForMap(cityId),
        getCities(),
      ]);
      setCities(citiesData);
      citiesRef.current = citiesData;
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
      // 自动尝试定位用户位置
      setTimeout(() => {
        locate();
      }, 500);
    });

    map.on('click', () => {
      if (markerClickedRef.current) {
        markerClickedRef.current = false;
        return;
      }
      // 导航模式下不清除状态
      if (showNavigationRef.current) {
        return;
      }
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
        const isYanshi = gym.name.includes('岩时');
        const isYanwu = gym.name.includes('岩舞');
        const isRealLogo = isBanana || isYanshi || isYanwu;
        const hasRandomLogo = !!gym.logo;
        const isLogo = isRealLogo || hasRandomLogo;
        const bgColor = isBanana ? '#FFD400' : '#f97316';
        const textColor = isBanana ? '#1a1a1a' : 'white';
        const borderColor = 'white';
        const zIndex = isBanana ? 300 : 200;
        
        let logoPath = '';
        if (isBanana) logoPath = './logos/香蕉.png';
        else if (isYanshi) logoPath = './logos/岩时.png';
        else if (isYanwu) logoPath = './logos/岩舞.png';
        else if (hasRandomLogo) logoPath = `./logos/${gym.logo}.png`;

        const markerId = `marker-${gym.id}`;
        let size = isLogo ? '40px' : '32px';
        const sizeNum = parseInt(size);
        const redDotCountDisplay = gym.red_dot_count || '';
        const redDotIsPill = redDotCountDisplay.length >= 3;
        const redDotStyle = redDotIsPill
          ? `min-width:22px;height:16px;padding:0 3px;border-radius:8px;font-size:9px;`
          : `width:12px;height:12px;border-radius:50%;font-size:9px;`;
        const redDotContent = gym.is_red_dot
          ? (redDotCountDisplay
              ? `<div style="position:absolute;top:-1px;right:-1px;${redDotStyle}background:#ef4444;z-index:10;display:flex;align-items:center;justify-content:center;color:white;font-weight:700;line-height:1;box-shadow:0 1px 3px rgba(0,0,0,0.3);">${redDotCountDisplay}</div>`
              : `<div style="position:absolute;top:-1px;right:-1px;width:12px;height:12px;background:#ef4444;border-radius:50%;z-index:10;"></div>`)
          : '';

        const innerContent = isLogo
          ? `<img src="${logoPath}" style="width:${size};height:${size};border-radius:10px;object-fit:contain;display:block;" alt="${gym.name.split('(')[0]}"/>`
          : `<div style="width:${size};height:${size};background:${bgColor};border-radius:10px;display:flex;align-items:center;justify-content:center;color:${textColor};font-weight:${isBanana ? '800' : '700'};font-size:${isBanana ? '14px' : '13px'};box-shadow:${isBanana ? '0 3px 12px rgba(255,212,0,0.5)' : '0 2px 8px rgba(0,0,0,0.25)'};border:2px solid ${borderColor};">${isBanana ? '香' : displayName}</div>`;

        const markerContent = `
          <div id="${markerId}" style="position:relative;transform:translate(-50%,-100%);cursor:pointer;">
            ${redDotContent}
            ${innerContent}
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
          markerClickedRef.current = true;
          // 如果导航面板开着，先关闭
          if (showNavigationRef.current) {
            closeNavigation();
          }
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
              markerClickedRef.current = true;
              // 如果导航面板开着，先关闭
              if (showNavigationRef.current) {
                closeNavigation();
              }
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
    // 清除导航
    if (showNavigationRef.current) {
      closeNavigation();
    }
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
    const AMapObj = (window as any).AMap;
    if (!AMapObj || !mapInstanceRef.current) return;

    setLocating(true);

    // 优先使用浏览器原生 API（更可靠）
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lng = pos.coords.longitude;
          const lat = pos.coords.latitude;
          const accuracy = pos.coords.accuracy;
          console.log('定位成功 (浏览器):', lng, lat, '精度:', accuracy);
          setUserLocation({ lng, lat });
          addUserLocationMarker(lng, lat, accuracy);
          mapInstanceRef.current.setZoomAndCenter(15, [lng, lat]);
          // 逆地理编码匹配城市
          reverseGeocodeAndMatchCity(lng, lat);
          setLocating(false);
        },
        (err) => {
          console.warn('浏览器定位失败:', err.code, err.message);
          // 降级：使用 AMap IP 定位
          aMapIpFallback();
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    } else {
      // 不支持浏览器定位，用 AMap IP 定位
      aMapIpFallback();
    }
  };

  // 逆地理编码，根据经纬度匹配城市（使用高德 REST API，更可靠）
  const reverseGeocodeAndMatchCity = async (lng: number, lat: number) => {
    if (citiesRef.current.length === 0) {
      console.warn('城市列表还没加载好，跳过自动匹配');
      return;
    }

    try {
      const response = await fetch(
        `https://restapi.amap.com/v3/geocode/regeo?key=ee175e6e8cf3639dd9566fb8268d0ead&location=${lng},${lat}`
      );
      const data = await response.json();

      if (data.status === '1' && data.regeocode) {
        const formattedAddress = data.regeocode.formatted_address || '';
        let cityName = '';
        if (data.regeocode.addressComponent) {
          const comp = data.regeocode.addressComponent;
          cityName = comp.city || comp.province || '';
        }
        console.log('定位城市:', cityName, '完整地址:', formattedAddress);

        const matchedCity = matchCityByName(cityName, formattedAddress);
        if (matchedCity) {
          console.log('匹配到城市:', matchedCity.name, 'id:', matchedCity.id);
          if (matchedCity.id !== cityId) {
            cityChangedByLocationRef.current = true;
            setCityId(matchedCity.id);
            setCityName(matchedCity.name);
          }
        } else {
          console.warn('未匹配到城市，保持当前城市:', cityName);
        }
      }
    } catch (err) {
      console.error('逆地理编码请求异常:', err);
    }
  };

  const matchCityByName = (cityName: string, fullAddress: string): City | null => {
    const cityList = citiesRef.current;
    if (cityList.length === 0) return null;

    const cleanName = cityName
      .replace(/市$/, '')
      .replace(/省$/, '')
      .replace(/自治区$/, '')
      .replace(/特别行政区$/, '')
      .trim();

    const extractCore = (name: string) => name.replace(/[（(][^）)]*[）)]/, '').trim();

    // 精确匹配
    let matched = cityList.find(c => c.name === cityName || c.name === cleanName);
    if (matched) return matched;

    // 精确匹配（去除括号后）
    matched = cityList.find(c => {
      const core = extractCore(c.name);
      return core === cleanName || core === cityName;
    });
    if (matched) return matched;

    // 模糊匹配：城市名包含或被包含
    matched = cityList.find(c =>
      c.name.includes(cleanName) || cleanName.includes(c.name.replace(/市$/, ''))
    );
    if (matched) return matched;

    // 模糊匹配（去除括号后）
    matched = cityList.find(c => {
      const core = extractCore(c.name);
      return core.includes(cleanName) || cleanName.includes(core);
    });
    if (matched) return matched;

    // 用完整地址匹配（找省份对应的"其他"项，如珠海 → 广东(其他)）
    if (fullAddress) {
      // 优先匹配带"(其他)"的省份项
      matched = cityList.find(c => {
        if (!c.name.includes('其他')) return false;
        const cn = extractCore(c.name).replace(/市$/, '').replace(/省$/, '');
        return fullAddress.includes(cn);
      });
      if (matched) return matched;

      // 其次用完整地址直接匹配
      matched = cityList.find(c => {
        const cn = extractCore(c.name).replace(/市$/, '').replace(/省$/, '');
        return fullAddress.includes(cn);
      });
      if (matched) return matched;
    }

    return null;
  };

  const aMapIpFallback = () => {
    const AMapObj = (window as any).AMap;
    if (!AMapObj || !mapInstanceRef.current) {
      setLocating(false);
      return;
    }

    // 使用 AMap.Geolocation 的 IP 定位兜底
    const geolocation = new AMapObj.Geolocation({
      enableHighAccuracy: false,
      timeout: 10000,
      showButton: false,
      showMarker: false,
      showCircle: false,
      panToLocation: true,
      zoomToAccuracy: true,
    });

    mapInstanceRef.current.addControl(geolocation);

    geolocation.getCurrentPosition((status: string, result: any) => {
      setLocating(false);
      if (status === 'complete') {
        const lng = result.position.getLng ? result.position.getLng() : result.position.lng;
        const lat = result.position.getLat ? result.position.getLat() : result.position.lat;
        const accuracy = result.accuracy || 1000;
        console.log('定位成功 (AMap IP):', lng, lat);
        setUserLocation({ lng, lat });
        addUserLocationMarker(lng, lat, accuracy);
        mapInstanceRef.current.setZoomAndCenter(15, [lng, lat]);
        // 逆地理编码匹配城市
        reverseGeocodeAndMatchCity(lng, lat);
      } else {
        console.warn('所有定位方式均失败:', status, result);
      }
      // 延迟移除，避免影响地图渲染
      setTimeout(() => {
        mapInstanceRef.current?.removeControl(geolocation);
      }, 1000);
    });
  };

  const addUserLocationMarker = (lng: number, lat: number, accuracy?: number) => {
    const AMapObj = (window as any).AMap;
    if (!AMapObj || !mapInstanceRef.current) return;

    // 清除旧的标记
    if (userLocationMarkerRef.current) {
      mapInstanceRef.current.remove(userLocationMarkerRef.current);
      userLocationMarkerRef.current = null;
    }
    if (userLocationCircleRef.current) {
      mapInstanceRef.current.remove(userLocationCircleRef.current);
      userLocationCircleRef.current = null;
    }

    // 精度圆圈
    if (accuracy && accuracy > 0) {
      const circle = new AMapObj.Circle({
        center: [lng, lat],
        radius: accuracy,
        strokeColor: '#4A90D9',
        strokeOpacity: 0.3,
        strokeWeight: 1,
        fillColor: '#4A90D9',
        fillOpacity: 0.1,
        zIndex: 50,
      });
      mapInstanceRef.current.add(circle);
      userLocationCircleRef.current = circle;
    }

    // 用户位置圆点（内联样式确保动画可用）
    const markerContent = `
      <div style="position:relative;transform:translate(-50%,-50%);width:48px;height:48px;">
        <style>
          @keyframes userPulse {
            0% { transform: translate(-50%,-50%) scale(1); opacity: 0.6; }
            50% { transform: translate(-50%,-50%) scale(2); opacity: 0; }
            100% { transform: translate(-50%,-50%) scale(1); opacity: 0; }
          }
        </style>
        <div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:32px;height:32px;background:rgba(74,144,217,0.3);border-radius:50%;animation:userPulse 2s infinite;"></div>
        <div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:16px;height:16px;background:#4A90D9;border-radius:50%;border:3px solid white;box-shadow:0 2px 8px rgba(74,144,217,0.5);"></div>
      </div>`;

    const marker = new AMapObj.Marker({
      position: [lng, lat],
      map: mapInstanceRef.current,
      offset: new AMapObj.Pixel(0, 0),
      content: markerContent,
      zIndex: 400,
    });
    userLocationMarkerRef.current = marker;
  };

  // 清除路线
  const clearRoute = () => {
    if (routePolylineRef.current) {
      mapInstanceRef.current?.remove(routePolylineRef.current);
      routePolylineRef.current = null;
    }
    if (routeStartMarkerRef.current) {
      mapInstanceRef.current?.remove(routeStartMarkerRef.current);
      routeStartMarkerRef.current = null;
    }
    if (routeEndMarkerRef.current) {
      mapInstanceRef.current?.remove(routeEndMarkerRef.current);
      routeEndMarkerRef.current = null;
    }
  };

  // 绘制路线折线
  const drawRoutePolyline = (pathStr: string) => {
    const AMapObj = (window as any).AMap;
    if (!AMapObj || !mapInstanceRef.current) return;

    // 清除旧折线
    if (routePolylineRef.current) {
      mapInstanceRef.current?.remove(routePolylineRef.current);
    }

    // 解析 polyline 数据 (格式: "lng1,lat1;lng2,lat2;...")
    const path = pathStr.split(';').map(point => {
      const [lng, lat] = point.split(',').map(Number);
      return [lng, lat];
    });

    // 创建路线折线
    const polyline = new AMapObj.Polyline({
      path: path,
      strokeColor: '#f97316',
      strokeWeight: 6,
      strokeOpacity: 0.8,
      lineCap: 'round',
      lineJoin: 'round',
      zIndex: 200,
    });

    mapInstanceRef.current?.add(polyline);
    routePolylineRef.current = polyline;

    // 添加终点标记
    const endMarker = new AMapObj.Marker({
      position: path[path.length - 1],
      map: mapInstanceRef.current,
      content: '<div style="width:24px;height:24px;background:#2B2B2E;border-radius:50%;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3);"></div>',
      offset: new AMapObj.Pixel(-12, -12),
      zIndex: 300,
    });
    routeEndMarkerRef.current = endMarker;

    // 调整视野包含整个路线
    mapInstanceRef.current?.setFitView([polyline, endMarker]);
  };

  // 规划路线 (使用 REST API)
  const planRoute = useCallback(async (mode: 'driving' | 'walking' | 'transit', destination: { lng: number; lat: number }) => {
    if (!userLocation || !mapInstanceRef.current) {
      alert('请先定位您的位置');
      return;
    }

    setNavigating(true);

    // 清除旧路线
    clearRoute();

    try {
      const key = 'ee175e6e8cf3639dd9566fb8268d0ead';
      const origin = `${userLocation.lng},${userLocation.lat}`;
      const dest = `${destination.lng},${destination.lat}`;

      let url = '';
      if (mode === 'driving') {
        url = `https://restapi.amap.com/v3/direction/driving?key=${key}&origin=${origin}&destination=${dest}&strategy=0&extensions=all&show_fields=polyline`;
      } else if (mode === 'walking') {
        url = `https://restapi.amap.com/v3/direction/walking?key=${key}&origin=${origin}&destination=${dest}&show_fields=polyline`;
      } else {
        url = `https://restapi.amap.com/v3/direction/transit?key=${key}&origin=${origin}&destination=${dest}&extensions=all&show_fields=polyline`;
      }

      const response = await fetch(url);
      const data = await response.json();
      console.log('路线规划返回:', data);
      console.log('完整 keys:', Object.keys(data));
      console.log('JSON预览:', JSON.stringify(data).substring(0, 1000));
      console.log('route类型:', typeof data.route, 'isArray:', Array.isArray(data.route));
      if (data.route) {
        console.log('route keys:', Object.keys(data.route));
      }

      if (data.status === '1') {
        let routeData: any;
        let distance: number;
        let duration: number;
        let polyline: string | undefined;

        if (mode === 'transit') {
          // 公交方案 - 使用 plans
          routeData = data.plans?.[0];
          if (!routeData) throw new Error('无公交方案');
          distance = routeData.distance;
          duration = routeData.duration;
        } else {
          // 驾车/步行方案 - route 是对象，paths 是数组
          const route = data.route;
          if (!route) throw new Error('无可用路线');
          
          // paths 是数组，取第一个路径
          const path = route.paths?.[0];
          if (!path) throw new Error('无路径数据');
          
          distance = path.distance;
          duration = path.duration;

          // 尝试获取 polyline - 可能在 path 上或 steps 内
          polyline = path.polyline;
          
          // 如果 path 上没有 polyline，尝试从 steps 中获取
          if (!polyline && path.steps && path.steps.length > 0) {
            // 合并所有 steps 的 polyline
            const polylines: string[] = [];
            for (const step of path.steps) {
              if (step.polyline) {
                polylines.push(step.polyline);
              }
            }
            if (polylines.length > 0) {
              polyline = polylines.join(';');
            }
          }

          console.log('path keys:', Object.keys(path));
          console.log('polyline存在:', !!polyline);
          console.log('distance:', distance, 'duration:', duration);

          // 绘制路线
          if (polyline) {
            drawRoutePolyline(polyline);
          }
        }

        // 显示距离和时间
        const distanceStr = distance > 1000
          ? `${(distance / 1000).toFixed(1)} km`
          : `${Math.round(distance)} m`;
        const timeStr = duration > 3600
          ? `${Math.floor(duration / 3600)}时${Math.floor((duration % 3600) / 60)}分`
          : `${Math.floor(duration / 60)}分钟`;

        setRouteInfo({ distance: distanceStr, time: timeStr });
      } else {
        throw new Error(data.info || '路线规划失败');
      }
    } catch (err: any) {
      console.error('路线规划失败:', err);
      // 更友好的错误信息
      if (err.message === '无可用路线' || err.message === '无公交方案') {
        setRouteInfo(null);
      } else {
        setRouteInfo(null);
      }
    } finally {
      setNavigating(false);
    }
  }, [userLocation]);

  // 点击导航按钮
  const handleNavigate = () => {
    if (!selectedGym) return;
    if (!userLocation) {
      alert('请先定位您的位置');
      return;
    }

    const dest = { lng: selectedGym.longitude!, lat: selectedGym.latitude! };
    navDestinationRef.current = dest;

    // 隐藏卡片，显示导航面板
    setSelectedGym(null);
    setSelectedGymDetail(null);
    setShowNavigation(true);
    showNavigationRef.current = true;

    // 默认驾车路线
    planRoute('driving', dest);
  };

  // 切换交通方式
  const switchNavMode = (mode: 'driving' | 'walking' | 'transit') => {
    setNavMode(mode);
    if (!navDestinationRef.current) return;
    planRoute(mode, navDestinationRef.current);
  };

  // 关闭导航
  const closeNavigation = () => {
    clearRoute();
    setShowNavigation(false);
    showNavigationRef.current = false;
    setRouteInfo(null);
    navDestinationRef.current = null;
  };

  // 打开手机导航
  const openPhoneNavigation = () => {
    if (!userLocation || !navDestinationRef.current) return;
    
    const modeMap = {
      driving: 0,  // 驾车
      walking: 1,  // 步行
      transit: 2,  // 公交
    };
    
    const type = modeMap[navMode];
    const dest = navDestinationRef.current;
    
    // 使用高德地图 URI scheme 打开手机导航
    // iOS: iosamap://path?sourceApplication=Guidy&sname=起点&dname=终点&slon=...&slat=...&dlon=...&dlat=...&t=类型
    // Android: amapuri://route/plan/?sourceApplication=Guidy&sname=起点&dname=终点&slon=...&slat=...&dlon=...&dlat=...&t=类型
    
    const params = new URLSearchParams({
      sourceApplication: 'Guidy',
      sname: '我的位置',
      dname: '攀岩馆',
      slon: userLocation.lng.toString(),
      slat: userLocation.lat.toString(),
      dlon: dest.lng.toString(),
      dlat: dest.lat.toString(),
      t: type.toString(),
    });
    
    // 尝试打开高德地图 App
    const amapUrl = `iosamap://path?${params.toString()}`;
    window.location.href = amapUrl;
    
    // 如果没安装，2秒后跳转网页版
    setTimeout(() => {
      // 使用 Web 版高德地图作为备选
      const webUrl = `https://uri.amap.com/navigation?${params.toString()}&src=Guidy&coordinate=gaode`;
      // 只在 App 未安装时跳转
      if (document.visibilityState === 'visible') {
        window.open(webUrl, '_blank');
      }
    }, 2000);
  };

  if (loading) {
    return <div className="flex items-center justify-center h-screen text-gray-500">加载中...</div>;
  }

  const renderDetailContent = () => (
    <>
      {/* 头部：logo + 名称 + 导航 */}
      <div className="flex gap-3">
        {/* 左侧logo */}
        <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-amber-700 to-amber-900 flex-shrink-0 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <svg className="w-8 h-8 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 20l4-8 3 6 2-4 4 6H3z" />
              <circle cx="8.5" cy="7" r="2" strokeWidth={1.5} />
            </svg>
          </div>
        </div>

        {/* 右侧信息 */}
        <div className="flex-1 min-w-0 flex items-start">
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-bold text-[#3B473B] truncate">
              {selectedGym!.name}
            </h2>
            <div className="flex items-center gap-3 mt-1.5">
              <span className="text-sm text-orange-500 font-semibold">
                距你 380m
              </span>
              <span className="text-xs px-2 py-0.5 bg-[#3B473B]/15 text-[#3B473B] rounded-full flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-green-600 rounded-full"></span>
                {selectedGym!.status === 'active' ? '营业中' : '已关闭'}
              </span>
            </div>
          </div>

          {/* 导航按钮 - 右上角 */}
          <button
            onClick={handleNavigate}
            className="ml-2 bg-[#2B2B2E] text-white px-3 py-2 rounded-[20px] font-semibold flex items-center justify-center gap-1 hover:bg-gray-800 transition-colors active:scale-[0.98] flex-shrink-0"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
            </svg>
            <span className="text-sm">导航</span>
          </button>
        </div>
      </div>

      {/* 地址 */}
      <div className="flex items-start gap-2 text-sm mt-4">
        <svg className="w-4 h-4 text-[#3B473B]/50 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
        <span className="text-[#3B473B]">{selectedGymDetail?.address || '地址暂未提供'}</span>
      </div>

      {/* 营业时间 */}
      <div className="flex items-center gap-2 text-sm mt-2">
        <svg className="w-4 h-4 text-[#3B473B]/50 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span className="text-[#3B473B]">
          营业时间：{selectedGymDetail?.opening_hours?.weekday || '暂未提供'}
        </span>
      </div>
    </>
  );

  return (
    <div className="relative w-full h-full flex flex-col bg-gray-50 overflow-hidden">
      {/* 地图区域 */}
      <div className="flex-1 relative min-h-0">
        {/* 15px 倒角边框框架（padding 模拟） */}
        <div className="absolute inset-0 p-[8px] pb-[8px] bg-[#9AB372] rounded-t-[20px]">
          <div ref={mapContainerRef} className="w-full h-full rounded-[20px] overflow-hidden" />
        </div>

        {/* 顶部通知按钮 */}
        <div className="absolute top-0 right-0 z-50 px-[46px] pt-[27px] pointer-events-none flex flex-col gap-2">
          <button className="w-10 h-10 bg-[#2B2B2E] rounded-full shadow-md flex items-center justify-center pointer-events-auto">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
            </svg>
          </button>
          {/* 定位按钮 */}
          <button 
            onClick={locate}
            className="w-10 h-10 bg-[#2B2B2E] rounded-full shadow-md flex items-center justify-center pointer-events-auto active:scale-95 transition-transform"
          >
            {/* 地图标记图标 */}
            <svg className={`w-5 h-5 ${locating ? 'text-blue-400 animate-pulse' : 'text-white'}`} fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 010-5 2.5 2.5 0 010 5z"/>
            </svg>
          </button>
        </div>

        {/* 悬浮卡片 - 选中岩馆时显示 */}
        {selectedGym && (
          <div className="absolute top-[40px] bottom-[90px] left-[26px] right-[26px] z-50 animate-slide-up flex flex-col">
            <div onClick={(e) => e.stopPropagation()} className="bg-[#F6E199] rounded-[20px] shadow-2xl overflow-hidden flex flex-col h-full">
              {/* 拖拽手柄 - 下滑关闭 */}
              <div
                className="flex justify-center pt-3 pb-1 cursor-pointer"
                onTouchStart={(e) => { touchStartYRef.current = e.touches[0].clientY; }}
                onTouchMove={(e) => {
                  const deltaY = e.touches[0].clientY - touchStartYRef.current;
                  if (deltaY > 60) {
                    setSelectedGym(null);
                  }
                }}
                onTouchEnd={() => { touchStartYRef.current = 0; }}
              >
                <div className="w-10 h-1.5 bg-[#3B473B]/30 rounded-full"></div>
              </div>

              {/* 香蕉岩馆 - Feed流视频网格 */}
              {(selectedGym.name.includes('香蕉') || selectedGym.name.toUpperCase().includes('BANANA')) ? (
                <div className="flex-1 min-h-0 overflow-y-auto px-3 pb-3 pt-1">
                  {renderDetailContent()}
                  <div className="grid grid-cols-2 gap-2 mt-4">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => (
                      <div key={i} className="bg-white rounded-xl overflow-hidden shadow-sm" onClick={() => setPlayingVideoIndex(i)}>
                        <div className="relative aspect-[3/4] bg-black">
                          <img
                            className="w-full h-full object-cover"
                            src={`./videos/video${i}.jpg`}
                            alt={`视频${i}`}
                          />
                          {/* 播放图标覆盖 */}
                          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <div className="w-10 h-10 bg-black/40 rounded-full flex items-center justify-center">
                              <svg className="w-5 h-5 text-white ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M8 5v14l11-7z"/>
                              </svg>
                            </div>
                          </div>
                        </div>
                        <div className="p-2">
                          <p className="text-xs font-medium text-[#3B473B] line-clamp-1">视频标题{['一','二','三','四','五','六','七','八','九'][i-1]}</p>
                          <div className="flex items-center justify-between mt-1">
                            <span className="text-[10px] text-[#3B473B]/60">视频{['一','二','三','四','五','六','七','八','九'][i-1]}</span>
                            <div className="flex items-center gap-0.5 text-[#3B473B]/60">
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                              </svg>
                              <span className="text-[10px]">{[128, 256, 384, 512, 640, 768, 896, 1024, 999][i-1]}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                /* 非香蕉岩馆 - 原有卡片内容 */
                <div className="px-4 pb-4 pt-2 flex-1 overflow-y-auto">
                  {renderDetailContent()}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 悬浮搜索栏 */}
      <div className="absolute bottom-[75px] left-0 right-0 z-40 px-[46px]">
        <div className="flex items-center gap-2 bg-[#2B2B2E] rounded-full shadow-lg px-3 py-[11px]">
          <div className="flex items-center gap-2 bg-gray-100 rounded-full px-3 py-1.5 whitespace-nowrap">
            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="搜索攀岩馆"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              className="bg-transparent outline-none text-sm text-gray-700 placeholder-gray-400 w-[90px]"
            />
          </div>
          <button
            onClick={() => setShowCityDrawer(true)}
            className="ml-auto flex items-center gap-1 bg-gray-100 rounded-full px-3 py-1.5 text-sm text-gray-700 flex-shrink-0"
          >
            <svg className="w-4 h-4 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a2 2 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span className="font-medium">{cityName}</span>
            <span className="text-xs text-gray-400">▾</span>
          </button>
        </div>

        {/* 导航按钮组 - 规划路线时显示 */}
        {showNavigation && (
          <div className="absolute right-[46px] bottom-[100px] z-40">
            {/* 时间距离提示框（在按钮左侧） */}
            {routeInfo && (
              <div className="absolute right-[60px] top-1/2 -translate-y-1/2 bg-[#2B2B2E]/95 backdrop-blur-sm rounded-lg px-3 py-2 text-white whitespace-nowrap shadow-lg">
                <div className="text-xs text-white/60">约</div>
                <div className="text-sm font-bold">{routeInfo.time}</div>
                <div className="text-xs text-white/60 mt-0.5">{routeInfo.distance}</div>
                {/* 三角形指向按钮 */}
                <div className="absolute right-[-4px] top-1/2 -translate-y-1/2 w-0 h-0 border-l-[4px] border-l-[#2B2B2E]/95 border-t-[4px] border-t-transparent border-b-[4px] border-b-transparent"></div>
              </div>
            )}
            
            {/* 按钮组外框 */}
            <div className="flex flex-col gap-1 bg-[#2B2B2E] rounded-[20px] shadow-lg p-2">
              {/* 驾车 */}
              <button
                onClick={() => switchNavMode('driving')}
                className={`w-10 h-10 rounded-xl flex items-center justify-center pointer-events-auto active:scale-95 transition-transform ${
                  navMode === 'driving' ? 'bg-orange-500' : 'bg-transparent'
                }`}
                title="驾车"
              >
                <span className={`text-sm font-bold ${navMode === 'driving' ? 'text-white' : 'text-white/70'}`}>驾</span>
              </button>
              
              {/* 步行 */}
              <button
                onClick={() => switchNavMode('walking')}
                className={`w-10 h-10 rounded-xl flex items-center justify-center pointer-events-auto active:scale-95 transition-transform ${
                  navMode === 'walking' ? 'bg-orange-500' : 'bg-transparent'
                }`}
                title="步行"
              >
                <span className={`text-sm font-bold ${navMode === 'walking' ? 'text-white' : 'text-white/70'}`}>步</span>
              </button>
              
              {/* 公交 */}
              <button
                onClick={() => switchNavMode('transit')}
                className={`w-10 h-10 rounded-xl flex items-center justify-center pointer-events-auto active:scale-95 transition-transform ${
                  navMode === 'transit' ? 'bg-orange-500' : 'bg-transparent'
                }`}
                title="公交"
              >
                <span className={`text-sm font-bold ${navMode === 'transit' ? 'text-white' : 'text-white/70'}`}>公</span>
              </button>
              
              <div className="h-px bg-white/20 mx-2 my-1"></div>
              
              {/* Go - 打开手机导航 */}
              <button
                onClick={openPhoneNavigation}
                disabled={!routeInfo}
                className={`w-10 h-10 rounded-xl flex items-center justify-center pointer-events-auto active:scale-95 transition-transform ${
                  routeInfo ? 'bg-transparent' : 'bg-transparent opacity-50'
                }`}
                title="开始导航"
              >
                <span className={`text-xs font-bold ${routeInfo ? 'text-white' : 'text-white/50'}`}>Go</span>
              </button>
            </div>
            
            {/* 关闭按钮 */}
            <button
              onClick={closeNavigation}
              className="w-10 h-10 rounded-[20px] shadow-lg flex items-center justify-center pointer-events-auto active:scale-95 transition-transform bg-[#2B2B2E] mt-2 mx-auto"
              title="关闭导航"
            >
              <svg className="w-4 h-4 text-white/70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}
      </div>

      {/* Tab 导航 */}
      <div className="bg-[#9AB372] border-t border-[#9AB372] shadow-lg relative z-30">
        <div className="flex items-center justify-around px-2 pt-0 pb-2">
          <button className="flex items-center py-[7px] px-[18px]">
            {/* 首页图标 - 小房子 */}
            <svg className="w-[26px] h-[26px] text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l9-9 9 9M5 10v10a1 1 0 001 1h3m10-11v10a1 1 0 01-1 1h-3m-6 0h6m-6 0v-6a1 1 0 011-1h4a1 1 0 011 1v6"/>
            </svg>
          </button>
          <button className="flex items-center py-[7px] px-[18px]">
            <svg className="w-[26px] h-[26px] text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </button>
          <button className="flex items-center py-[7px] px-[18px]">
            <svg className="w-[26px] h-[26px] text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </button>
          <button className="flex items-center py-[7px] px-[18px]">
            <svg className="w-[26px] h-[26px] text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
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

      {/* 全屏视频播放器 - 覆盖整个手机屏幕 */}
      {playingVideoIndex !== null && (
        <div
          className="fixed inset-0 z-[100] bg-black"
          onTouchStart={(e) => {
            touchStartXRef.current = e.touches[0].clientX;
            touchStartYRef.current = e.touches[0].clientY;
          }}
          onTouchMove={(e) => {
            const dx = e.touches[0].clientX - touchStartXRef.current;
            const dy = e.touches[0].clientY - touchStartYRef.current;
            if (dy > 100 && Math.abs(dy) > Math.abs(dx)) {
              setPlayingVideoIndex(null);
            } else if (dx > 100 && Math.abs(dx) > Math.abs(dy)) {
              setPlayingVideoIndex(null);
            }
          }}
        >
          {/* 返回按钮 */}
          <button
            onClick={() => setPlayingVideoIndex(null)}
            className="absolute top-4 left-4 z-10 w-10 h-10 bg-black/50 rounded-full flex items-center justify-center"
          >
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          {/* 视频 */}
          <video
            className="w-full h-full object-cover"
            src={`./videos/video${playingVideoIndex}.mp4`}
            autoPlay
            playsInline
            controls
            onClick={(e) => {
              const v = e.currentTarget;
              if (v.paused) v.play(); else v.pause();
            }}
          />
        </div>
      )}
    </div>
  );
}
