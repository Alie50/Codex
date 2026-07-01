// إعدادات الـ API والموديل الثابتة بناءً على طلبك
const API_KEY = "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";
const MODEL_NAME = "Qwen 3.6 27B"; // الإسم التقني لـ Queen 3.6 27b المتوافق مع Groq

const codeInput = document.getElementById('code-input');
const previewOutput = document.getElementById('preview-output');
const pickerBtn = document.getElementById('picker-btn');
const aiPromptInput = document.getElementById('ai-prompt');
const generateBtn = document.getElementById('generate-btn');

let isPickerActive = false;
let selectedElementContent = "";

// 1. تحديث المعاينة الحية فوراً عند الكتابة اليدوية أو تعديل الكود
function updatePreview() {
    const code = codeInput.value;
    const documentTarget = previewOutput.contentDocument || previewOutput.contentWindow.document;
    if (!documentTarget) return;
    
    documentTarget.open();
    documentTarget.write(code);
    documentTarget.close();
    
    // إعادة ربط أحداث أداة الاختيار لداخل الـ iframe بعد كل تحديث
    injectPickerStylesAndEvents();
}

codeInput.addEventListener('input', updatePreview);

// 2. تفعيل وتعطيل سهم اختيار العناصر
pickerBtn.addEventListener('click', () => {
    isPickerActive = !isPickerActive;
    if (isPickerActive) {
        pickerBtn.classList.add('active');
        pickerBtn.innerText = "🛑";
        aiPromptInput.placeholder = "الان اضغط على أي عنصر في شاشة المعاينة (اليسار)...";
    } else {
        pickerBtn.classList.remove('active');
        pickerBtn.innerText = "↗";
        aiPromptInput.placeholder = "تم إلغاء التحديد. اكتب هنا مباشرة...";
    }
});

// 3. حقن ميزة تحديد العناصر وتأثير الـ Hover داخل شاشة المعاينة (iframe)
function injectPickerStylesAndEvents() {
    const iframeDoc = previewOutput.contentDocument || previewOutput.contentWindow.document;
    if (!iframeDoc || !iframeDoc.body) return;

    let styleEl = iframeDoc.getElementById('picker-style');
    if (!styleEl) {
        styleEl = iframeDoc.createElement('style');
        styleEl.id = 'picker-style';
        styleEl.innerHTML = `
            .ai-picker-hover {
                outline: 2px dashed #2ea44f !important;
                background-color: rgba(46, 164, 79, 0.1) !important;
                cursor: crosshair !important;
            }
        `;
        iframeDoc.head.appendChild(styleEl);
    }

    // إزالة الأحداث القديمة لتجنب التكرار
    iframeDoc.body.removeEventListener('mouseover', handleMouseOver);
    iframeDoc.body.removeEventListener('mouseout', handleMouseOut);
    iframeDoc.body.removeEventListener('click', handleElementClick, true);

    // إضافة الأحداث الجديدة
    iframeDoc.body.addEventListener('mouseover', handleMouseOver);
    iframeDoc.body.addEventListener('mouseout', handleMouseOut);
    iframeDoc.body.addEventListener('click', handleElementClick, true);
}

function handleMouseOver(e) {
    if (!isPickerActive || e.target === e.currentTarget) return;
    e.target.classList.add('ai-picker-hover');
}

function handleMouseOut(e) {
    e.target.classList.remove('ai-picker-hover');
}

function handleElementClick(e) {
    if (!isPickerActive) return;
    
    e.preventDefault();
    e.stopPropagation();
    e.target.classList.remove('ai-picker-hover');
    
    // جلب الكود البرمجي للعنصر المختار بالكامل
    selectedElementContent = e.target.outerHTML;

    // توجيه المستخدم لكتابة التعديل المطلوب
    aiPromptInput.value = `[العنصر المختار: ${e.target.tagName.toLowerCase()}] -> اكتب هنا التعديل المطلوب`;
    aiPromptInput.focus();

    // إيقاف السهم تلقائياً بعد الاختيار بنجاح
    isPickerActive = false;
    pickerBtn.classList.remove('active');
    pickerBtn.innerText = "↗";
}

// 4. الاتصال بـ Groq لتعديل الكود المختار والكامل
generateBtn.addEventListener('click', async () => {
    const prompt = aiPromptInput.value.trim();
    const fullCode = codeInput.value.trim();

    if (!fullCode) {
        alert('الرجاء وضع كود الصفحة الكامل في الجانب الأيمن أولاً!');
        return;
    }
    if (!prompt) {
        alert('الرجاء كتابة التعديل أو الأمر المطلوب تنفيذه!');
        return;
    }

    generateBtn.disabled = true;
    generateBtn.innerText = 'جاري المعالجة...';

    try {
        const response = await fetch('https://groq.com', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: MODEL_NAME,
                messages: [
                    {
                        role: "system",
                        content: "أنت مبرمج خبير. ستتلقى كود صفحة كامل (HTML/CSS/JS) بالإضافة إلى طلب تعديل من المستخدم قد يستهدف عنصراً معيناً. قم بإجراء التعديل المطلوب على الكود بدقة وأعد الكود البرمجي الكامل للصفحة بعد التعديل مباشرة، بدون أي مقدمات أو شرح أو علامات اقتباس مثل ```html."
                    },
                    {
                        role: "user",
                        content: `الكود الحالي بالكامل:\n${fullCode}\n\nالعنصر المستهدف بالتعديل (إن وجد):\n${selectedElementContent}\n\nطلب التعديل المطلوبة:\n${prompt}`
                    }
                ],
                temperature: 0.3
            })
        });

        const data = await response.json();

        if (response.ok) {
            const generatedCode = data.choices.message.content;
            codeInput.value = generatedCode; // تحديث الكود في المحرر
            updatePreview(); // تحديث شاشة العرض مباشرة
            aiPromptInput.value = ""; // تفريغ حقل الأوامر
            selectedElementContent = "";
        } else {
            alert(`خطأ من الخادم: ${data.error?.message || 'فشل الاتصال بـ Groq'}`);
        }
    } catch (error) {
        console.error(error);
        alert('حدث خطأ أثناء معالجة الطلب، يرجى التحقق من اتصال الإنترنت.');
    } finally {
        generateBtn.disabled = false;
        generateBtn.innerText = 'تعديل بالذكاء الاصطناعي ✨';
    }
});

// تشغيل ميزة الحقن بمجرد تحميل الـ iframe بالكامل
previewOutput.addEventListener('load', injectPickerStylesAndEvents);
