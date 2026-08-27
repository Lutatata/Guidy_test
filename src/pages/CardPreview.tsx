import React from 'react';

const CardPreview: React.FC = () => {
  const mockGym = {
    name: '岩时攀岩馆',
    branch: '中山公园店',
    tags: ['抱石', '难度墙', '自动保护'],
    distance: 380,
    status: '营业中',
    address: '上海市长宁区中山公园路100号',
    phone: '021-6666-8888',
    openingHours: '09:00 - 22:00',
    rating: 4.8,
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="w-full max-w-[380px]">
        {/* 卡片单独预览 */}
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
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
                    {mockGym.name}
                  </h2>
                  <p className="text-sm text-gray-500 truncate">{mockGym.branch}</p>
                  
                  {/* 标签 */}
                  <div className="flex flex-wrap gap-1 mt-1">
                    {mockGym.tags.map((tag, i) => (
                      <span key={i} className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full">
                        {tag}
                      </span>
                    ))}
                  </div>

                  {/* 距离 + 状态 */}
                  <div className="flex items-center gap-3 mt-2">
                    <span className="text-sm text-orange-500 font-semibold">
                      距你 {mockGym.distance}m
                    </span>
                    <span className="text-xs px-2 py-0.5 bg-green-50 text-green-600 rounded-full flex items-center gap-1">
                      <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
                      {mockGym.status}
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
                <span className="text-gray-700">{mockGym.address}</span>
              </div>

              {/* 电话 */}
              <div className="flex items-center gap-2 text-sm">
                <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
                <span className="text-gray-700">{mockGym.phone}</span>
              </div>

              {/* 营业时间 */}
              <div className="flex items-center gap-2 text-sm">
                <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-gray-700">
                  营业时间：{mockGym.openingHours}
                </span>
              </div>

              {/* 评分 */}
              <div className="flex items-center gap-2 text-sm">
                <svg className="w-4 h-4 text-yellow-400 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                </svg>
                <span className="text-gray-700 font-medium">{mockGym.rating}</span>
                <span className="text-gray-400">· 56条评价</span>
              </div>
            </div>

            {/* 导航按钮 */}
            <button className="w-full mt-4 bg-black text-white py-3.5 rounded-2xl font-semibold flex items-center justify-center gap-2 hover:bg-gray-800 transition-colors active:scale-[0.98]">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
              </svg>
              导航到这里去
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CardPreview;
