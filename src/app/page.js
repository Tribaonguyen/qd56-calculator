'use client';

import { useState, useRef, useEffect } from 'react';
import { calculateAll } from '@/utils/calculator';
import html2canvas from 'html2canvas';

export default function Home() {
  const [params, setParams] = useState({
    width: '',
    depth: '',
    roadWidth: '',
  });
  
  const [results, setResults] = useState({
    area: 0,
    density: 0,
    rearSetback: 0,
    maxFloors: 0,
    constructionArea: 0
  });

  const [detailedResults, setDetailedResults] = useState(null);

  const [aiNote, setAiNote] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const [inputMode, setInputMode] = useState('ocr'); // 'ocr' | 'manual'
  const [manualParams, setManualParams] = useState({
    location: '',            // Vị trí thửa đất
    residentialArea: '',     // Diện tích thổ cư
    otherArea: '',           // Diện tích khác
    otherAreaNote: '',       // Ghi chú diện tích khác
    roadWidth: '',           // Lộ giới
    shapeCoords: '',         // Hình thù thửa đất / Hệ toạ độ
    extraNotes: ''           // Lưu ý khác
  });

  const [apiType, setApiType] = useState('aistudio');
  const [uiApiKey, setUiApiKey] = useState('');
  const [vertexJson, setVertexJson] = useState('');
  const [vertexLocation, setVertexLocation] = useState('us-central1');
  const [showApiConfig, setShowApiConfig] = useState(false);
  const fileInputRef = useRef(null);

  // Khôi phục Cấu hình AI từ LocalStorage khi khởi động
  useEffect(() => {
    const savedType = localStorage.getItem('qd56_apiType');
    const savedKey = localStorage.getItem('qd56_apiKey');
    const savedVertex = localStorage.getItem('qd56_vertexJson');
    const savedLocation = localStorage.getItem('qd56_vertexLocation');
    
    if (savedType) setApiType(savedType);
    if (savedKey) setUiApiKey(savedKey);
    if (savedVertex) setVertexJson(savedVertex);
    if (savedLocation) setVertexLocation(savedLocation);
  }, []);

  // Tự động lưu cấu hình mỗi khi thay đổi
  useEffect(() => {
    localStorage.setItem('qd56_apiType', apiType);
    localStorage.setItem('qd56_apiKey', uiApiKey);
    localStorage.setItem('qd56_vertexJson', vertexJson);
    localStorage.setItem('qd56_vertexLocation', vertexLocation);
  }, [apiType, uiApiKey, vertexJson, vertexLocation]);

  // Cập nhật kết quả mỗi khi params thay đổi
  useEffect(() => {
    const calc = calculateAll(params);
    setResults({
      ...calc,
      constructionArea: calc.area > 0 && calc.density > 0 
        ? Math.round(calc.area * (calc.density / 100) * 100) / 100 
        : 0
    });
  }, [params]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setParams(prev => ({ ...prev, [name]: value }));
  };

  const handleManualChange = (e) => {
    const { name, value } = e.target;
    setManualParams(prev => ({ ...prev, [name]: value }));
  };

  const submitManualConsulting = async () => {
    if (!manualParams.residentialArea || !manualParams.roadWidth) {
      alert('Vui lòng nhập tối thiểu Diện tích thổ cư và Lộ giới để tư vấn!');
      return;
    }
    
    if (apiType === 'vertex' && !vertexJson) {
      alert('Vui lòng nhập nội dung file JSON của Service Account cho Vertex AI trong Cấu Hình Nguồn AI.');
      setShowApiConfig(true);
      return;
    }

    setIsProcessing(true);
    const formData = new FormData();
    formData.append('apiType', apiType);
    if (apiType === 'aistudio') {
      formData.append('apiKey', uiApiKey);
    } else {
      formData.append('vertexJson', vertexJson);
      formData.append('vertexLocation', vertexLocation);
    }
    
    formData.append('action', 'manual');
    formData.append('manualData', JSON.stringify(manualParams));

    try {
      const response = await fetch('/api/extract-so', {
        method: 'POST',
        body: formData
      });

      const data = await response.json();
      
      if (data.success && data.data) {
        // Fallback for OCR or backward compatibility
        const rArea = data.data.area || Number(manualParams.residentialArea) + Number(manualParams.otherArea || 0);
        const rDensity = data.data.density || 0;
        setResults({
          area: rArea,
          density: rDensity,
          rearSetback: data.data.rearSetback || 0,
          maxFloors: data.data.maxFloors || 0,
          constructionArea: Math.round(rArea * (rDensity / 100) * 100) / 100
        });

        // Set detailed results for Manual Consultation
        // Set detailed results for Manual Consultation
        setDetailedResults({
          constructionArea: data.data.constructionArea || '',
          density: data.data.density || { value: '', note: '' },
          balcony: data.data.balcony || { value: '', note: '' },
          buildingHeight: data.data.buildingHeight || { value: '', note: '' },
          floorStructure: data.data.floorStructure || { value: '', note: '' },
          rearSetback: data.data.rearSetback || { value: '', note: '' },
        });

        setAiNote(data.data.aiNote || '');
      } else {
        alert('Lỗi: ' + data.error);
      }
    } catch (error) {
      console.error(error);
      alert('Có lỗi xảy ra khi kết nối đếp AI API');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      await processImages(Array.from(files));
    }
  };

  const handleFileChange = async (e) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      await processImages(Array.from(files));
    }
  };

  const processImages = async (files) => {
    const validFiles = files.filter(file => file.type.startsWith('image/'));
    if (validFiles.length === 0) {
      alert('Vui lòng tải lên file hình ảnh');
      return;
    }

    setIsProcessing(true);
    const formData = new FormData();
    formData.append('apiType', apiType);
    formData.append('action', 'ocr');
    if (apiType === 'aistudio') {
      formData.append('apiKey', uiApiKey);
    } else {
      formData.append('vertexJson', vertexJson);
      formData.append('vertexLocation', vertexLocation);
    }
    
    validFiles.forEach(file => {
      formData.append('files', file);
    });

    try {
      const response = await fetch('/api/extract-so', {
        method: 'POST',
        body: formData
      });

      const data = await response.json();
      
      if (data.success && data.data) {
        setParams({
          width: data.data.width?.toString() || '',
          depth: data.data.depth?.toString() || '',
          roadWidth: data.data.roadWidth?.toString() || '',
        });
        setAiNote(data.data.aiNote || '');
      } else {
        alert('Lỗi: ' + data.error);
      }
    } catch (error) {
      console.error(error);
      alert('Có lỗi xảy ra khi kết nối đếp AI API');
    } finally {
      setIsProcessing(false);
    }
  };

  const downloadReport = async () => {
    const element = document.getElementById('capture-area');
    if (!element) return;
    try {
      const canvas = await html2canvas(element, { scale: 2, useCORS: true, backgroundColor: '#0F1626' });
      const link = document.createElement('a');
      link.download = 'Bao_Cao_Quy_Mo_Xay_Dung.png';
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (err) {
      console.error('Lỗi khi tải ảnh:', err);
      alert('Không thể tạo ảnh báo cáo, vui lòng thử lại.');
    }
  };

  return (
    <main className="container">
      <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
        <h1 className="text-gradient" style={{ fontSize: '2.5rem' }}>Tính Quy Mô Công Trình</h1>
        <p className="text-muted">Áp dụng chuẩn Quyết định 56/2021/QĐ-UBND TP.HCM</p>
      </div>

      <div className="app-grid">
        {/* Cột trái: Input */}
        <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          
          <div style={{ background: 'var(--glass-bg)', borderRadius: 'var(--radius-md)', border: '1px solid var(--glass-border)', overflow: 'hidden' }}>
            <button 
              onClick={() => setShowApiConfig(!showApiConfig)}
              style={{ width: '100%', padding: '1rem', background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--text-main)' }}
            >
              <h4 style={{ margin: 0, color: 'var(--accent-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                🔑 Cấu Hình Nguồn AI
              </h4>
              <span>{showApiConfig ? '▲' : '▼'}</span>
            </button>

            {showApiConfig && (
              <div style={{ padding: '0 1rem 1rem 1rem', borderTop: '1px solid var(--glass-border)' }}>
                <div style={{ display: 'flex', gap: '1.5rem', marginBottom: '1.2rem', marginTop: '1rem' }}>
                  <label style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <input type="radio" name="apiType" value="aistudio" checked={apiType === 'aistudio'} onChange={(e) => setApiType(e.target.value)} />
                    AI Studio (API Key)
                  </label>
                  <label style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <input type="radio" name="apiType" value="vertex" checked={apiType === 'vertex'} onChange={(e) => setApiType(e.target.value)} />
                    Vertex AI (GCP)
                  </label>
                </div>
                
                {apiType === 'aistudio' ? (
                  <input 
                    type="password" 
                    className="form-input" 
                    placeholder="Nhập GEMINI API KEY (AIza...)"
                    value={uiApiKey}
                    onChange={e => setUiApiKey(e.target.value)}
                  />
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                    <textarea 
                      className="form-input" 
                      placeholder='Paste toàn bộ nội dung file JSON Service Account vào đây...'
                      rows={4}
                      value={vertexJson} 
                      onChange={e => setVertexJson(e.target.value)} 
                      style={{ resize: 'vertical' }}
                    />
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="text-muted" style={{ fontSize: '0.85rem' }}>Location (Mặc định: us-central1)</label>
                      <input type="text" className="form-input" placeholder="us-central1" value={vertexLocation} onChange={e => setVertexLocation(e.target.value)} />
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* TAB CHUYỂN ĐỔI CHẾ ĐỘ */}
          <div style={{ display: 'flex', gap: '0.5rem', background: 'var(--glass-bg)', padding: '0.5rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--glass-border)' }}>
            <button 
              onClick={() => setInputMode('ocr')}
              style={{ flex: 1, padding: '0.8rem 0.4rem', borderRadius: 'var(--radius-sm)', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 'clamp(0.75rem, 2vw, 0.95rem)', background: inputMode === 'ocr' ? 'var(--accent-primary)' : 'transparent', color: inputMode === 'ocr' ? '#fff' : 'var(--text-main)', transition: 'all 0.3s', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
            >
              📸 Quét Ảnh Đại Khái 
            </button>
            <button 
              onClick={() => setInputMode('manual')}
              style={{ flex: 1, padding: '0.8rem 0.4rem', borderRadius: 'var(--radius-sm)', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 'clamp(0.75rem, 2vw, 0.95rem)', background: inputMode === 'manual' ? 'var(--accent-secondary)' : 'transparent', color: inputMode === 'manual' ? '#fff' : 'var(--text-main)', transition: 'all 0.3s', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
            >
              ✍️ Tư Vấn Chuẩn QĐ 56
            </button>
          </div>

          {inputMode === 'ocr' ? (
            <>
              <div 
                className={`upload-area ${isDragging ? 'active' : ''}`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current.click()}
              >
                <div className={`upload-icon ${isProcessing ? 'animate-spin' : ''}`}>
                   {isProcessing ? '⚙️' : '📄'}
                </div>
                {isProcessing ? (
                  <h3 style={{ color: 'var(--accent-primary)', margin: 0 }}>AI đang phân tích các trang sổ...</h3>
                ) : (
                  <>
                    <h3 style={{ margin: 0 }}>Tải ảnh Sổ Hồng lên đây (Nhiều ảnh)</h3>
                    <p className="text-muted" style={{ fontSize: '0.875rem' }}>Drag & drop hoặc click để chọn nhiều file ảnh bản vẽ, hoạ đồ</p>
                  </>
                )}
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  style={{ display: 'none' }} 
                  accept="image/*"
                  multiple
                  onChange={handleFileChange}
                />
              </div>

              <div>
                <h3 style={{ borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.5rem', marginBottom: '1.5rem' }}>
                  Thông Số Đất & Đường (AI đã đọc)
                </h3>
                
                <div className="form-group">
                  <label className="form-label">Chiều rộng mặt tiền (m)</label>
                  <input type="number" className="form-input" name="width" value={params.width} onChange={handleInputChange} onFocus={(e) => e.target.select()} placeholder="VD: 5.0" step="0.1" />
                </div>
                
                <div className="form-group">
                  <label className="form-label">Chiều sâu lô đất (m)</label>
                  <input type="number" className="form-input" name="depth" value={params.depth} onChange={handleInputChange} onFocus={(e) => e.target.select()} placeholder="VD: 20.0" step="0.1" />
                </div>
                
                <div className="form-group">
                  <label className="form-label">Lộ giới hẻm/đường mặt tiền (m)</label>
                  <input type="number" className="form-input" name="roadWidth" value={params.roadWidth} onChange={handleInputChange} onFocus={(e) => e.target.select()} placeholder="VD: 12.0" step="0.1" />
                </div>
              </div>
            </>
          ) : (
            <div className="manual-form">
              <h3 style={{ borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.5rem', marginBottom: '1.5rem', color: 'var(--accent-secondary)' }}>
                Nhập Dữ Liệu Tra Cứu (Nhập Tay)
              </h3>
              
              <div className="form-group">
                <label className="form-label">1. Vị trí thửa đất (Quận, Đường, Hẻm...)</label>
                <input type="text" className="form-input" name="location" value={manualParams.location} onChange={handleManualChange} placeholder="VD: Hẻm 4m đường Lê Văn Việt, Quận 9" />
              </div>

              <div style={{ display: 'flex', gap: '1rem' }}>
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label">2. Diện tích thổ cư (m²)</label>
                  <input type="number" className="form-input" name="residentialArea" value={manualParams.residentialArea} onChange={handleManualChange} onFocus={(e) => e.target.select()} placeholder="VD: 100" />
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label">3. Lộ giới (m)</label>
                  <input type="number" className="form-input" name="roadWidth" value={manualParams.roadWidth} onChange={handleManualChange} onFocus={(e) => e.target.select()} placeholder="VD: 12" />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '1rem' }}>
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label">4. Diện tích khác (m²)</label>
                  <input type="number" className="form-input" name="otherArea" value={manualParams.otherArea} onChange={handleManualChange} onFocus={(e) => e.target.select()} placeholder="VD: 20" />
                </div>
                <div className="form-group" style={{ flex: 2 }}>
                  <label className="form-label">Nội dung diện tích khác</label>
                  <input type="text" className="form-input" name="otherAreaNote" value={manualParams.otherAreaNote} onChange={handleManualChange} placeholder="VD: Đất trồng cây lâu năm / Nông nghiệp..." />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">5. Hình thù của mảnh đất / Hệ toạ độ</label>
                <textarea className="form-input" name="shapeCoords" value={manualParams.shapeCoords} onChange={handleManualChange} placeholder="VD: Đất tóp hậu, xéo góc trái, Toạ độ VN2000 X:, Y:..." rows={3} style={{ resize: 'vertical' }}></textarea>
              </div>

              <div className="form-group">
                <label className="form-label">6. Lưu ý khác (Nếu có)</label>
                <textarea className="form-input" name="extraNotes" value={manualParams.extraNotes} onChange={handleManualChange} placeholder="Nhập các yêu cầu riêng biệt hoặc mong muốn..." rows={2} style={{ resize: 'vertical' }}></textarea>
              </div>

              <button 
                onClick={submitManualConsulting}
                disabled={isProcessing}
                style={{
                  width: '100%',
                  padding: '1rem',
                  fontSize: '1.1rem',
                  fontWeight: 'bold',
                  background: isProcessing ? 'var(--glass-border)' : 'var(--accent-secondary)',
                  color: isProcessing ? 'var(--text-muted)' : '#fff',
                  border: 'none',
                  borderRadius: 'var(--radius-md)',
                  cursor: isProcessing ? 'not-allowed' : 'pointer',
                  transition: 'all 0.3s'
                }}
              >
                {isProcessing ? 'AI Đang Nghiên Cứu QĐ 56...' : 'GỬI AI TỔNG HỢP VÀ ĐỐI CHIẾU'}
              </button>
            </div>
          )}
        </div>

        {/* Cột phải: Output */}
        <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column' }}>
          
          {inputMode === 'manual' && detailedResults ? (
            <>
              <div id="capture-area" style={{ 
                background: 'var(--bg-secondary)', 
                borderRadius: 'var(--radius-md)', 
                border: '1px solid var(--glass-border)', 
                padding: '1.2rem', 
                marginBottom: '1rem',
                boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
                color: 'var(--text-main)'
              }}>
                <div style={{ textAlign: 'center', marginBottom: '1.2rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.8rem' }}>
                  <h2 style={{ color: 'var(--accent-primary)', fontSize: '1.3rem', marginBottom: '0.2rem', textTransform: 'uppercase', letterSpacing: '1px' }}>BÁO CÁO THẨM ĐỊNH</h2>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', margin: 0 }}>Căn cứ QĐ 56/2021/QĐ-UBND TP.HCM</p>
                </div>

                {/* Phần thông tin đầu vào */}
                <div style={{ display: 'flex', gap: '0.6rem', marginBottom: '1rem' }}>
                  <div style={{ flex: 1, padding: '0.6rem', background: 'rgba(255,255,255,0.03)', borderRadius: 'var(--radius-sm)', border: '1px dashed rgba(255,255,255,0.1)' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Thổ cư / Đất khác</div>
                    <div style={{ fontSize: '1rem', fontWeight: 'bold' }}>{manualParams.residentialArea || 0} m² / {manualParams.otherArea || 0} m²</div>
                  </div>
                  <div style={{ flex: 1, padding: '0.6rem', background: 'rgba(255,255,255,0.03)', borderRadius: 'var(--radius-sm)', border: '1px dashed rgba(255,255,255,0.1)' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Lộ giới đường</div>
                    <div style={{ fontSize: '1rem', fontWeight: 'bold' }}>{manualParams.roadWidth || 0} m</div>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                  <div style={{ padding: '0.8rem', background: 'rgba(245, 158, 11, 0.15)', borderRadius: 'var(--radius-sm)', borderLeft: '4px solid var(--warning)' }}>
                    <div style={{ color: 'var(--warning)', fontWeight: 'bold', fontSize: '0.85rem', textTransform: 'uppercase' }}>📐 Diện Tích Xây Dựng Trệt</div>
                    <div style={{ fontSize: '1.8rem', color: 'var(--text-main)', fontWeight: '900', lineHeight: '1.2' }}>{detailedResults.constructionArea}</div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem' }}>
                    <div style={{ padding: '0.8rem', background: 'rgba(255,255,255,0.03)', borderRadius: 'var(--radius-sm)' }}>
                      <div style={{ color: 'var(--accent-primary)', fontWeight: 'bold', fontSize: '0.8rem', marginBottom: '0.2rem' }}>📊 Mật độ xây dựng</div>
                      <div style={{ fontSize: '1.4rem', fontWeight: '800', color: 'var(--text-main)', marginBottom: '0.2rem' }}>{detailedResults.density?.value}</div>
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', lineHeight: '1.3' }}>{detailedResults.density?.note}</div>
                    </div>
                    <div style={{ padding: '0.8rem', background: 'rgba(255,255,255,0.03)', borderRadius: 'var(--radius-sm)' }}>
                      <div style={{ color: 'var(--accent-primary)', fontWeight: 'bold', fontSize: '0.8rem', marginBottom: '0.2rem' }}>📏 Cao độ toà nhà</div>
                      <div style={{ fontSize: '1.4rem', fontWeight: '800', color: 'var(--text-main)', marginBottom: '0.2rem' }}>{detailedResults.buildingHeight?.value}</div>
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', lineHeight: '1.3' }}>{detailedResults.buildingHeight?.note}</div>
                    </div>
                  </div>

                  <div style={{ padding: '0.8rem', background: 'rgba(255,255,255,0.03)', borderRadius: 'var(--radius-sm)' }}>
                    <div style={{ color: 'var(--accent-primary)', fontWeight: 'bold', fontSize: '0.8rem', marginBottom: '0.2rem' }}>🏢 Cấu trúc tầng được phép</div>
                    <div style={{ fontSize: '1.2rem', fontWeight: '800', color: 'var(--text-main)', marginBottom: '0.2rem' }}>{detailedResults.floorStructure?.value}</div>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', lineHeight: '1.3' }}>{detailedResults.floorStructure?.note}</div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem' }}>
                    <div style={{ padding: '0.8rem', background: 'rgba(16, 185, 129, 0.05)', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(16, 185, 129, 0.1)' }}>
                      <div style={{ color: 'var(--success)', fontWeight: 'bold', fontSize: '0.8rem', marginBottom: '0.2rem' }}>🪴 Ban công đua ra</div>
                      <div style={{ fontSize: '1.2rem', fontWeight: '800', color: 'var(--text-main)', marginBottom: '0.2rem' }}>{detailedResults.balcony?.value}</div>
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', lineHeight: '1.3' }}>{detailedResults.balcony?.note}</div>
                    </div>
                    <div style={{ padding: '0.8rem', background: 'rgba(239, 68, 68, 0.05)', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(239, 68, 68, 0.1)' }}>
                      <div style={{ color: 'var(--danger)', fontWeight: 'bold', fontSize: '0.8rem', marginBottom: '0.2rem' }}>🛑 Lùi sân sau</div>
                      <div style={{ fontSize: '1.2rem', fontWeight: '800', color: 'var(--text-main)', marginBottom: '0.2rem' }}>{detailedResults.rearSetback?.value}</div>
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', lineHeight: '1.3' }}>{detailedResults.rearSetback?.note}</div>
                    </div>
                  </div>
                  
                  {aiNote && (
                    <div style={{ marginTop: '0.5rem', padding: '0.8rem', background: 'rgba(13, 148, 136, 0.1)', borderRadius: 'var(--radius-sm)', borderLeft: '3px solid var(--accent-secondary)' }}>
                      <div style={{ color: 'var(--accent-secondary)', fontWeight: 'bold', fontSize: '0.8rem', marginBottom: '0.3rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <span>🧠</span> Nhận định từ AI
                      </div>
                      <div style={{ color: 'var(--text-main)', fontSize: '0.85rem', lineHeight: '1.5' }}>{aiNote}</div>
                    </div>
                  )}
                </div>
                
                <div style={{ textAlign: 'center', marginTop: '1.2rem', paddingTop: '0.8rem', borderTop: '1px dashed rgba(255,255,255,0.1)' }}>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.7rem', margin: 0, opacity: 0.6 }}>Được phân tích tự động bởi Hệ thống AI Thẩm Định QĐ56</p>
                </div>
              </div>

              <button 
                onClick={downloadReport}
                style={{
                  width: '100%',
                  padding: '1rem',
                  fontSize: '1rem',
                  fontWeight: 'bold',
                  background: 'var(--glass-bg)',
                  color: 'var(--accent-primary)',
                  border: '1px solid var(--accent-primary)',
                  borderRadius: 'var(--radius-md)',
                  cursor: 'pointer',
                  transition: 'all 0.3s',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}
                onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(245, 158, 11, 0.1)'; }}
                onMouseOut={(e) => { e.currentTarget.style.background = 'var(--glass-bg)'; }}
              >
                📸 Tải Ảnh Báo Cáo
              </button>
            </>
          ) : (
            <>
              <h2 style={{ marginBottom: '1.5rem', color: 'var(--accent-secondary)' }}>Kết Quả Tính Toán</h2>
              <div className="result-grid" style={{ marginBottom: '2rem' }}>
              <div className="result-card" style={{ gridColumn: '1 / -1', background: 'rgba(245, 158, 11, 0.1)', borderColor: 'rgba(245, 158, 11, 0.3)' }}>
                <div className="result-label" style={{ color: 'var(--warning)' }}>DIỆN TÍCH XÂY DỰNG TRỆT DỰ KIẾN</div>
                <div className="result-value" style={{ color: 'var(--warning)', fontSize: 'clamp(2rem, 5vw, 2.8rem)' }}>
                  {results.constructionArea.toLocaleString('vi-VN')}
                </div>
                <div className="text-muted">m² (Tương đương lô đất x Mật độ)</div>
              </div>

              <div className="result-card">
                <div className="result-label">DIỆN TÍCH TỔNG</div>
                <div className="result-value" style={{ color: 'var(--success)' }}>
                  {results.area.toLocaleString('vi-VN')}
                </div>
                <div className="text-muted">m²</div>
              </div>

              <div className="result-card">
                <div className="result-label">MẬT ĐỘ XÂY DỰNG</div>
                <div className="result-value" style={{ color: 'var(--accent-primary)' }}>
                  {results.density}
                </div>
                <div className="text-muted">%</div>
              </div>

              <div className="result-card">
                <div className="result-label">SỐ TẦNG TỐI ĐA</div>
                <div className="result-value" style={{ color: 'var(--warning)' }}>
                  {results.maxFloors}
                </div>
                <div className="text-muted">tầng (chưa gồm lửng/mái)</div>
              </div>

              <div className="result-card">
                <div className="result-label">LÙI SÂN SAU</div>
                <div className="result-value" style={{ color: 'var(--danger)' }}>
                  {results.rearSetback}
                </div>
                <div className="text-muted">m</div>
              </div>
            </div>
            </>
          )}

          {inputMode === 'ocr' && aiNote && (
            <div style={{ padding: '0.8rem 1rem', marginBottom: '1.2rem', background: 'rgba(16, 185, 129, 0.1)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
              <h4 style={{ color: 'var(--success)', marginBottom: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1rem' }}>
                <span>🧠</span> AI Đánh Giá Thực Tế:
              </h4>
              <p style={{ margin: 0, fontSize: '0.85rem', lineHeight: '1.5', color: 'var(--text-main)' }}>
                {aiNote}
              </p>
            </div>
          )}

          {inputMode === 'ocr' && (
            <div style={{ marginTop: 'auto', padding: '1rem', background: 'rgba(59, 130, 246, 0.05)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
              <h4 style={{ color: 'var(--accent-primary)', marginBottom: '0.4rem', fontSize: '0.9rem' }}>Ghi chú áp dụng QĐ 56:</h4>
              <ul className="text-muted" style={{ paddingLeft: '1.2rem', fontSize: '0.8rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <li>Mật độ xây dựng được tính toán theo bảng nội suy đối với khu vực các Quận hiện hữu.</li>
                <li>Số tầng phụ thuộc hoàn toàn vào lộ giới đường tiếp giáp mặt tiền nhà.</li>
                <li>Tùy vào quy hoạch 1/500 thực tế của khu vực mà có thể áp dụng thêm chỉ giới đường đỏ / lùi trước.</li>
              </ul>
            </div>
          )}
        </div>

      </div>
    </main>
  );
}
