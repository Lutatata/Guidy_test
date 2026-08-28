// 主应用组件 - 移动端布局
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import MapPage from '@/pages/MapPage';
import GymDetailPage from '@/pages/GymDetailPage';
import CardPreview from '@/pages/CardPreview';

function App() {
  return (
    <HashRouter>
      <div className="w-screen h-screen bg-gray-50 overflow-hidden relative mx-auto" style={{ maxWidth: '480px' }}>
        <Routes>
          {/* 首页 = 地图页，默认上海 */}
          <Route path="/" element={<Navigate to="/map?city=1" replace />} />
          <Route path="/map" element={<MapPage />} />
          <Route path="/gym/:id" element={<GymDetailPage />} />
          <Route path="/card-preview" element={<CardPreview />} />
        </Routes>
      </div>
    </HashRouter>
  );
}

export default App;
