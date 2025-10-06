// Device fingerprinting utility
class DeviceFingerprint {
  static async generateFingerprint() {
    console.log('🔒 Starting device fingerprinting...');
    
    const fingerprint = {
      userAgent: navigator.userAgent,
      screenResolution: `${screen.width}x${screen.height}`,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      language: navigator.language,
      platform: navigator.platform,
      cookiesEnabled: navigator.cookieEnabled,
      doNotTrack: navigator.doNotTrack,
      deviceMemory: navigator.deviceMemory || 'unknown',
      hardwareConcurrency: navigator.hardwareConcurrency || 'unknown',
      colorDepth: screen.colorDepth,
      pixelDepth: screen.pixelDepth
    };
    
    // Add canvas fingerprinting
    fingerprint.canvasFingerprint = await this.getCanvasFingerprint();
    
    // Add WebGL fingerprinting
    fingerprint.webglFingerprint = this.getWebGLFingerprint();
    
    // Generate unique device ID hash
    const dataString = JSON.stringify(fingerprint);
    fingerprint.deviceId = await this.hashString(dataString);
    
    console.log('✅ Device fingerprint generated:', fingerprint.deviceId);
    return fingerprint;
  }
  
  static async getCanvasFingerprint() {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    ctx.textBaseline = 'top';
    ctx.font = '14px Arial';
    ctx.fillText('Device fingerprint test 🔒', 2, 2);
    
    return canvas.toDataURL();
  }
  
  static getWebGLFingerprint() {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    
    if (!gl) return 'WebGL not supported';
    
    return {
      vendor: gl.getParameter(gl.VENDOR),
      renderer: gl.getParameter(gl.RENDERER),
      version: gl.getParameter(gl.VERSION),
      shadingLanguageVersion: gl.getParameter(gl.SHADING_LANGUAGE_VERSION)
    };
  }
  
  static async hashString(str) {
    const encoder = new TextEncoder();
    const data = encoder.encode(str);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').substring(0, 16);
  }
}

export default DeviceFingerprint;