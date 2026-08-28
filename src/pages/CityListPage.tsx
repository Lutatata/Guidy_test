// 城市列表页
import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { getCities } from '@/api/cities';
import type { City } from '@/types';

export default function CityListPage() {
  const [cities, setCities] = useState<City[]>([]);
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const data = await getCities();
      setCities(data);
    } catch (error) {
      console.error('加载城市列表失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredCities = cities.filter((city) =>
    city.name.toLowerCase().includes(keyword.toLowerCase())
  );

  if (loading) {
    return <div className="flex items-center justify-center h-screen">加载中...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 顶部导航 */}
      <header className="bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-md mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Link to="/" className="text-blue-500 text-sm">← 返回</Link>
            <h1 className="text-lg font-semibold">城市列表</h1>
          </div>
          <input
            type="text"
            placeholder="搜索城市..."
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            className="w-full mt-3 px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-blue-500"
          />
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 py-6">
        {/* 统计 */}
        <div className="bg-white rounded-xl p-4 shadow-sm mb-6">
          <div className="text-center">
            <div className="text-3xl font-bold text-blue-500">{cities.length}</div>
            <div className="text-sm text-gray-500">覆盖城市</div>
          </div>
        </div>

        {/* 城市列表 */}
        <div className="grid grid-cols-2 gap-3">
          {filteredCities.map((city) => (
            <Link
              key={city.id}
              to={`/map?city=${city.id}`}
              className="bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow text-center"
            >
              <div className="font-semibold text-gray-800">{city.name}</div>
              <div className="text-sm text-gray-500 mt-1">{city.gym_count} 家岩馆</div>
            </Link>
          ))}
        </div>

        {filteredCities.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            未找到匹配的城市
          </div>
        )}
      </main>
    </div>
  );
}
