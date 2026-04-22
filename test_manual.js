async function test() {
  const fd = new FormData();
  fd.append('apiType', 'aistudio');
  fd.append('apiKey', 'AIzaSyAObsJTqdf_Lwtv_88bnHWxHOZBUx_T-XA');
  fd.append('action', 'manual');
  
  const manualData = {
    location: "64/8 Bình Lợi, Phường 13, Quận Bình Thạnh, TP.HCM",
    residentialArea: "321.6",
    otherArea: "0",
    otherAreaNote: "Phần đất phía sau không được công nhận",
    roadWidth: "7",
    shapeCoords: "Đất bề ngang 11.56m, chiều sâu hơn 26m. Phía cuối đất có phần diện tích khoảng 5.5m x 11.8m bị gạch chéo không được công nhận.",
    extraNotes: "Cần tư vấn sát sao về số tầng, mật độ và khoảng lùi cho khu vực Bình Lợi."
  };
  
  fd.append('manualData', JSON.stringify(manualData));

  try {
    const res = await fetch('http://localhost:3000/api/extract-so', {
      method: 'POST',
      body: fd
    });
    const text = await res.text();
    console.log('Status:', res.status);
    console.log('Body:', text);
  } catch(e) {
    console.error('Fetch error:', e);
  }
}
test();
