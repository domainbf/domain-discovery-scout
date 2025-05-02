
import React, { useState } from 'react';
import { FaSearch, FaRegLightbulb, FaRegCopy, FaDownload } from 'react-icons/fa'; // 图标
import { lookupDomain } from './utils/domainLookup';

const App = () => {
  const [domain, setDomain] = useState('');
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const handleLookup = async () => {
    setLoading(true);
    const lookupResult = await lookupDomain(domain);
    setResult(lookupResult);
    setLoading(false);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('数据已复制到剪贴板');
  };

  const downloadData = () => {
    const blob = new Blob([result.rawData], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${domain}-whois.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{
      fontFamily: 'Arial, sans-serif',
      padding: '20px',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100vh',
      backgroundColor: '#f9f9f9',
    }}>
      {/* 顶部警告文字 */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        marginBottom: '20px',
      }}>
        <FaRegLightbulb style={{ marginRight: '10px', color: '#555' }} />
        <p style={{
          fontSize: '14px',
          color: '#555',
        }}>我们不存储不记录所有查询内容</p>
      </div>

      {/* 搜索框部分 */}
      <h1 style={{
        fontSize: '24px',
        fontWeight: 'bold',
        marginBottom: '10px',
        color: '#222',
      }}>
        <FaSearch style={{ marginRight: '8px' }} />
        域名信息查询
      </h1>
      <p style={{
        fontSize: '14px',
        color: '#777',
        marginBottom: '20px',
      }}>请在下方输入要查找的域名或IP等信息</p>

      <div style={{
        display: 'flex',
        alignItems: 'center',
        marginBottom: '20px',
        width: '100%',
        maxWidth: '400px',
      }}>
        <input
          type="text"
          value={domain}
          onChange={(e) => setDomain(e.target.value)}
          placeholder="l.ke"
          style={{
            padding: '10px',
            width: '100%',
            border: '1px solid #ccc',
            borderRadius: '4px 0 0 4px',
            outline: 'none',
          }}
        />
        <button
          onClick={handleLookup}
          style={{
            padding: '10px',
            backgroundColor: '#007BFF',
            color: '#fff',
            border: 'none',
            borderRadius: '0 4px 4px 0',
            cursor: 'pointer',
          }}
        >
          ➡️
        </button>
      </div>

      {loading && <p>查询中...</p>}

      {/* 查询结果 */}
      {result && (
        <div style={{
          marginTop: '20px',
          textAlign: 'left',
          width: '100%',
          maxWidth: '600px',
          backgroundColor: '#fff',
          borderRadius: '8px',
          boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
          padding: '20px',
        }}>
          <h2 style={{ fontSize: '18px', color: '#333', marginBottom: '10px' }}>查询结果</h2>
          <p><strong>域名:</strong> {result.domain}</p>
          
          {/* 修复：检查状态属性是否存在并且是数组 */}
          {result.status && Array.isArray(result.status) && (
            <p><strong>状态:</strong> {result.status.map((s: string, index: number) => (
              <span key={index} style={{
                display: 'inline-block',
                backgroundColor: '#f0f0f0',
                padding: '5px 8px',
                margin: '2px',
                borderRadius: '4px',
                fontSize: '12px',
              }}>{s}</span>
            ))}</p>
          )}
          
          <p><strong>注册商:</strong> {result.registrar || '未知'}</p>
          <p><strong>注册日期:</strong> {result.creationDate || result.created || '未知'}</p>
          <p><strong>更新日期:</strong> {result.updatedDate || result.updated || '未知'}</p>
          <p><strong>到期日期:</strong> {result.expiryDate || result.expires || '未知'}</p>
          
          {/* 修复：检查nameservers属性是否存在 */}
          {result.nameservers && Array.isArray(result.nameservers) && (
            <p><strong>DNS:</strong> {result.nameservers.map((dns: string, index: number) => (
              <span key={index} style={{
                display: 'inline-block',
                backgroundColor: '#f0f0f0',
                padding: '5px 8px',
                margin: '2px',
                borderRadius: '4px',
                fontSize: '12px',
              }}>{dns}</span>
            ))}</p>
          )}
          
          {/* 避免直接访问result.dns */}
          <p><strong>DNSSEC:</strong> {result.dnssec ? '是' : '否'}</p>

          {/* 原始数据 */}
          {result.rawData && (
            <>
              <p style={{ marginTop: '20px', fontSize: '14px', color: '#555' }}>
                原始whois数据可复制及下载 👉
              </p>
              <pre style={{
                backgroundColor: '#f9f9f9',
                padding: '10px',
                border: '1px solid #ccc',
                borderRadius: '4px',
                fontSize: '12px',
                overflowX: 'auto',
              }}>{result.rawData}</pre>
              <div style={{
                display: 'flex',
                justifyContent: 'flex-end',
                marginTop: '10px',
              }}>
                <button
                  onClick={() => copyToClipboard(result.rawData)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '8px 12px',
                    marginRight: '10px',
                    backgroundColor: '#f0f0f0',
                    border: '1px solid #ccc',
                    borderRadius: '4px',
                    cursor: 'pointer',
                  }}
                >
                  <FaRegCopy style={{ marginRight: '5px' }} /> 复制
                </button>
                <button
                  onClick={downloadData}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '8px 12px',
                    backgroundColor: '#007BFF',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                  }}
                >
                  <FaDownload style={{ marginRight: '5px' }} /> 下载
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default App;
