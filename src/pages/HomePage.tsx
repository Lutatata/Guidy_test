// 首页
import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { getCities } from '@/api/cities';
import { getGyms } from '@/api/gyms';
import type { City, GymListOut } from '@/types';

export default function HomePage() {
  const [cities, setCities] = useState<City[]>([]);
  const [recentGyms, setRecentGyms] = useState<GymListOut[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [citiesData, gymsData] = await Promise.all([
        getCities(),
        getGyms({ limit: 6 }),
      ]);
      setCities(citiesData);
      setRecentGyms(gymsData);
    } catch (error) {
      console.error('加载数据失败:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-screen">加载中...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 顶部导航 */}
      <header className="bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-md mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold text-center text-gray-800">🧗 小路书</h1>
          <p className="text-center text-gray-500 text-sm mt-1">发现身边的攀岩馆</p>
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 py-6 space-y-8">
        {/* 快捷入口 */}
        <div className="grid grid-cols-2 gap-4">
          <Link
            to="/map"
            className="bg-blue-500 text-white rounded-xl p-6 text-center hover:bg-blue-600 transition-colors"
          >
            <div className="text-3xl mb-2">🗺️</div>
            <div className="font-semibold">地图探索</div>
          </Link>
          <Link
            to="/cities"
            className="bg-green-500 text-white rounded-xl p-6 text-center hover:bg-green-600 transition-colors"
          >
            <div className="text-3xl mb-2">🏙️</div>
            <div className="font-semibold">城市列表</div>
          </Link>
        </div>

        {/* 热门城市 */}
        <section>
          <h2 className="text-lg font-semibold mb-4 text-gray-800">热门城市</h2>
          <div className="flex flex-wrap gap-2">
            {cities.slice(0, 12).map((city) => (
              <Link
                key={city.id}
                to={`/map?city=${city.id}`}
                className="bg-white border border-gray-200 rounded-full px-4 py-2 text-sm text-gray-700 hover:border-blue-500 hover:text-blue-500 transition-colors"
              >
                {city.name} ({city.gym_count})
              </Link>
            ))}
          </div>
        </section>

        {/* 推荐岩馆 */}
        <section>
          <h2 className="text-lg font-semibold mb-4 text-gray-800">热门岩馆</h2>
          <div className="space-y-3">
            {recentGyms.map((gym) => (
              <Link
                key={gym.id}
                to={`/gym/${gym.id}`}
                className="block bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="font-semibold text-gray-800">{gym.name}</div>
                <div className="text-sm text-gray-500 mt-1">
                  {gym.climb_type && <span className="mr-2">{gym.climb_type}</span>}
                  {gym.day_ticket && <span>¥{gym.day_ticket}/日</span>}
                </div>
              </Link>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
