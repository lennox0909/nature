document.addEventListener('DOMContentLoaded', () => {
    // 初始化變數
    let qrCode = null;
    let currentLogoBase64 = "Taipei_Veterans_General_Hospital_Emblem.svg";

    // DOM 元素
    const dataInput = document.getElementById('qr-data');
    const clearTextBtn = document.getElementById('clear-text');
    const logoUpload = document.getElementById('logo-upload');
    const clearLogoBtn = document.getElementById('clear-logo');
    const downloadBtn = document.getElementById('download-btn');
    const fileNameInput = document.getElementById('file-name-input');
    const qrContainer = document.getElementById('qr-container');

    // 預設內容
    const defaultData = "https://www.google.com";
    dataInput.value = defaultData;

    // 設定預設檔名 MyQR-yyyy-mmdd
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    const defaultFileName = `MyQR-${yyyy}-${mm}${dd}`;
    fileNameInput.value = defaultFileName;

    // 設定 UI 顯示預設 Logo
    clearLogoBtn.classList.remove('hidden');

    // 初始化 QR CodeStyling 實例
    function initQRCode() {
        qrCode = new QRCodeStyling({
            width: 300,
            height: 300,
            data: defaultData,
            image: currentLogoBase64,
            dotsOptions: {
                color: "#0f172a",
                type: "rounded" // 圓角樣式看起來更現代
            },
            backgroundOptions: {
                color: "#ffffff",
            },
            imageOptions: {
                crossOrigin: "anonymous",
                margin: 10,
                imageSize: 0.4 // Logo 佔比 (40%)
            },
            qrOptions: {
                errorCorrectionLevel: 'H' // 【關鍵】必須設為 H 才能有足夠的容錯率放 Frame
            }
        });

        qrContainer.innerHTML = ""; // 清空容器
        qrCode.append(qrContainer);
    }

    // 更新 QR Code
    function updateQRCode() {
        if (!qrCode) return;

        const dataText = dataInput.value.trim() || defaultData;

        qrCode.update({
            data: dataText,
            image: currentLogoBase64,
            dotsOptions: {
                color: "#0f172a"
            },
            imageOptions: {
                margin: 10
            }
        });
    }

    // 監聽文字輸入
    dataInput.addEventListener('input', updateQRCode);

    // 清除文字
    clearTextBtn.addEventListener('click', () => {
        dataInput.value = "";
        dataInput.focus(); // 讓游標自動回到輸入框
        updateQRCode();
    });

    // 處理圖片上傳
    logoUpload.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            clearLogoBtn.classList.remove('hidden');

            const reader = new FileReader();
            reader.onload = (event) => {
                currentLogoBase64 = event.target.result;
                updateQRCode();
            };
            reader.readAsDataURL(file);
        }
    });

    // 清除圖片
    clearLogoBtn.addEventListener('click', () => {
        logoUpload.value = ""; // 重置 input file
        clearLogoBtn.classList.add('hidden');
        currentLogoBase64 = null;
        updateQRCode();
    });

    // 處理下載 (支援選擇位置與檔名)
    downloadBtn.addEventListener('click', async () => {
        if (!qrCode) return;

        const ext = document.querySelector('input[name="download-ext"]:checked').value;
        const baseFileName = fileNameInput.value.trim() || defaultFileName;

        // 嘗試使用現代 File System Access API 喚起「另存新檔」對話框
        if ('showSaveFilePicker' in window && typeof qrCode.getRawData === 'function') {
            try {
                const blob = await qrCode.getRawData(ext);

                // 喚起原生選擇視窗
                const handle = await window.showSaveFilePicker({
                    suggestedName: `${baseFileName}.${ext}`,
                    types: [{
                        description: 'QR Code 圖片檔',
                        accept: {
                            [ext === 'svg' ? 'image/svg+xml' : `image/${ext}`]: [`.${ext}`]
                        }
                    }]
                });

                // 寫入檔案
                const writable = await handle.createWritable();
                await writable.write(blob);
                await writable.close();

                return; // 下載成功，結束流程
            } catch (err) {
                // 如果使用者主動取消選擇，則不處理
                if (err.name === 'AbortError') return;
                console.warn('File System API 失敗，退回預設下載模式:', err);
            }
        }

        // Fallback 降級處理：給不支援 showSaveFilePicker 的瀏覽器使用
        qrCode.download({
            name: baseFileName,
            extension: ext
        });
    });

    // 初始執行
    initQRCode();
});