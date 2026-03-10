import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ConfigProvider, theme } from 'antd';
import ru_RU from 'antd/locale/ru_RU';
import Layout from './components/shared/Layout';
import Home from './components/Home';
import CreateRoom from './components/CreateRoom';
import JoinRoom from './components/JoinRoom';
import Room from './components/Room';

function App() {
  return (
    <ConfigProvider
      locale={ru_RU}
      theme={{
        algorithm: theme.defaultAlgorithm,
        token: {
          colorPrimary: '#1890ff',
        },
      }}
    >
      <BrowserRouter>
        <Layout>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/create" element={<CreateRoom />} />
            <Route path="/join/:roomId" element={<JoinRoom />} />
            <Route path="/room/:roomId" element={<Room />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Layout>
      </BrowserRouter>
    </ConfigProvider>
  );
}

export default App;