import type { ReactNode } from 'react';
import { Layout as AntLayout, Typography } from 'antd';

const { Header, Content } = AntLayout;
const { Title } = Typography;

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  return (
    <AntLayout style={{ minHeight: '100vh' }}>
      <Header style={{ 
        background: '#fff', 
        padding: '0 50px',
        borderBottom: '1px solid #f0f0f0',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
      }}>
        <Title level={3} style={{ margin: '16px 0', color: '#1890ff' }}>
          🃏 Poker Planning
        </Title>
      </Header>
      <Content style={{ padding: '50px', background: '#f0f2f5' }}>
        <div style={{ 
          background: '#fff', 
          padding: '24px', 
          borderRadius: '8px',
          boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
          maxWidth: '1200px',
          margin: '0 auto',
        }}>
          {children}
        </div>
      </Content>
    </AntLayout>
  );
}