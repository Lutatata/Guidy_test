// 岩馆详情页 - 移动端
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { getGymDetail } from '@/api/gyms';
import type { GymDetail } from '@/types';

export default function GymDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [gym, setGym] = useState<GymDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      loadGym(id);
    }
  }, [id]);

  const loadGym = async (gymId: string) => {
    try {
      const data = await getGymDetail(gymId);
      setGym(data);
    } catch (err) {
      setError('加载岩馆详情失败');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-screen text-gray-500">加载中...</div>;
  }

  if (error || !gym) {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-4">
        <p className="text-red-500">{error || '岩馆不存在'}</p>
        <Link to="/map" className="text-blue-500 underline">返回地图</Link>
      </div>
    );
  }

  const goBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate('/map');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* 顶部导航栏 */}
      <header className="sticky top-0 z-50 bg-white shadow-sm">
        <div className="flex items-center px-4 py-3">
          <button
            onClick={goBack}
            className="flex items-center gap-1 text-blue-500 text-base"
          >
            <span className="text-xl">←</span>
            <span>返回</span>
          </button>
          <h1 className="flex-1 text-center font-medium text-gray-800 truncate px-2">
            {gym.name}
          </h1>
          <div className="w-16" />
        </div>
      </header>

      <main className="px-4 py-4 space-y-4">
        {/* 岩馆基本信息卡片 */}
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <h1 className="text-xl font-bold text-gray-800">{gym.name}</h1>
          {gym.rating && (
            <div className="flex items-center gap-1 mt-2">
              <span className="text-yellow-500 text-lg">★</span>
              <span className="font-semibold">{gym.rating.toFixed(1)}</span>
              <span className="text-gray-400 text-sm ml-1">{gym.views} 次浏览</span>
            </div>
          )}
          {gym.status === 'closed' && (
            <div className="mt-2 inline-block bg-red-50 text-red-500 px-2 py-1 rounded text-sm">
              ⚠️ 已关闭
            </div>
          )}
          {gym.climb_type && (
            <div className="mt-2 inline-block bg-blue-50 text-blue-600 px-2 py-1 rounded text-sm">
              {gym.climb_type}
            </div>
          )}
        </div>

        {/* 位置信息 */}
        {(gym.address || gym.phone) && (
          <section className="bg-white rounded-xl p-4 shadow-sm space-y-3">
            <h2 className="font-semibold text-gray-700 text-sm text-gray-500">📍 位置与联系</h2>
            {gym.address && (
              <p className="text-sm text-gray-700">{gym.address}</p>
            )}
            {gym.phone && (
              <p className="text-sm text-gray-700">📞 {gym.phone}</p>
            )}
            {gym.latitude && gym.longitude && (
              <a
                href={`https://uri.amap.com/marker?position=${gym.longitude},${gym.latitude}&name=${encodeURIComponent(gym.name)}`}
                target="_blank"
                rel="noreferrer"
                className="block w-full bg-blue-500 text-white rounded-lg py-2 text-center font-medium mt-2"
              >
                在地图中导航
              </a>
            )}
          </section>
        )}

        {/* 营业时间 */}
        {gym.opening_hours && (gym.opening_hours.weekday || gym.opening_hours.weekend) && (
          <section className="bg-white rounded-xl p-4 shadow-sm">
            <h2 className="font-semibold text-sm text-gray-500 mb-3">⏰ 营业时间</h2>
            <div className="space-y-2">
              {gym.opening_hours.weekday && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">工作日</span>
                  <span className="text-gray-800">{gym.opening_hours.weekday}</span>
                </div>
              )}
              {gym.opening_hours.weekend && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">周末</span>
                  <span className="text-gray-800">{gym.opening_hours.weekend}</span>
                </div>
              )}
            </div>
          </section>
        )}

        {/* 票价信息 */}
        {(gym.day_ticket !== null || gym.month_card !== null || gym.year_card !== null) && (
          <section className="bg-white rounded-xl p-4 shadow-sm">
            <h2 className="font-semibold text-sm text-gray-500 mb-3">💰 票价</h2>
            <div className="grid grid-cols-3 gap-3">
              {gym.day_ticket !== null && (
                <div className="text-center bg-gray-50 rounded-lg py-3">
                  <div className="text-lg font-bold text-blue-500">¥{gym.day_ticket}</div>
                  <div className="text-xs text-gray-500">日票</div>
                </div>
              )}
              {gym.month_card !== null && (
                <div className="text-center bg-gray-50 rounded-lg py-3">
                  <div className="text-lg font-bold text-green-500">¥{gym.month_card}</div>
                  <div className="text-xs text-gray-500">月卡</div>
                </div>
              )}
              {gym.year_card !== null && (
                <div className="text-center bg-gray-50 rounded-lg py-3">
                  <div className="text-lg font-bold text-orange-500">¥{gym.year_card}</div>
                  <div className="text-xs text-gray-500">年卡</div>
                </div>
              )}
            </div>
          </section>
        )}

        {/* 攀爬信息 */}
        {(gym.boulder_routes !== null || gym.sport_routes !== null || gym.area !== null || gym.route_change_cycle || gym.route_setter || gym.facility_count !== null) && (
          <section className="bg-white rounded-xl p-4 shadow-sm">
            <h2 className="font-semibold text-sm text-gray-500 mb-3">🧗 攀爬信息</h2>
            <div className="space-y-2 text-sm">
              {gym.boulder_routes !== null && (
                <div className="flex justify-between">
                  <span className="text-gray-500">抱石线路</span>
                  <span className="text-gray-800">{gym.boulder_routes} 条</span>
                </div>
              )}
              {gym.sport_routes !== null && (
                <div className="flex justify-between">
                  <span className="text-gray-500">难度线路</span>
                  <span className="text-gray-800">{gym.sport_routes} 条</span>
                </div>
              )}
              {gym.area !== null && (
                <div className="flex justify-between">
                  <span className="text-gray-500">面积</span>
                  <span className="text-gray-800">{gym.area} ㎡</span>
                </div>
              )}
              {gym.route_change_cycle && (
                <div className="flex justify-between">
                  <span className="text-gray-500">换线周期</span>
                  <span className="text-gray-800">{gym.route_change_cycle}</span>
                </div>
              )}
              {gym.route_setter && (
                <div className="flex justify-between">
                  <span className="text-gray-500">定线员</span>
                  <span className="text-gray-800">{gym.route_setter}</span>
                </div>
              )}
              {gym.facility_count !== null && (
                <div className="flex justify-between">
                  <span className="text-gray-500">设施数量</span>
                  <span className="text-gray-800">{gym.facility_count}</span>
                </div>
              )}
            </div>
          </section>
        )}

        {/* 统计数据 */}
        <section className="bg-white rounded-xl p-4 shadow-sm">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-lg font-bold text-gray-800">{gym.likes}</div>
              <div className="text-xs text-gray-500">👍 点赞</div>
            </div>
            <div>
              <div className="text-lg font-bold text-gray-800">{gym.favorites}</div>
              <div className="text-xs text-gray-500">⭐ 收藏</div>
            </div>
            <div>
              <div className="text-lg font-bold text-gray-800">{gym.views}</div>
              <div className="text-xs text-gray-500">👁 浏览</div>
            </div>
          </div>
        </section>

        {/* 营业时间说明 */}
        {(!gym.opening_hours?.weekday && !gym.opening_hours?.weekend) &&
          (gym.day_ticket === null && gym.month_card === null && gym.year_card === null) &&
          gym.boulder_routes === null && gym.sport_routes === null && gym.area === null &&
          !gym.route_change_cycle && !gym.route_setter && gym.facility_count === null && (
            <div className="text-center text-gray-400 text-sm py-8">
              详细信息待补充
            </div>
          )}
      </main>

      {/* 底部操作栏 */}
      <footer className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-3 max-w-md mx-auto">
        <div className="flex gap-3">
          <button className="flex-1 bg-gray-100 text-gray-700 rounded-lg py-3 font-medium">
            ⭐ 收藏
          </button>
          <button className="flex-1 bg-blue-500 text-white rounded-lg py-3 font-medium">
            📞 电话咨询
          </button>
        </div>
      </footer>
    </div>
  );
}
