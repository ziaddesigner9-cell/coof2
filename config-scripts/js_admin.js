// [كود محسن لعرض البيانات]

/** وظيفة لتحويل الصورة إلى صيغة WebP لتقليل الحجم مع الحفاظ على الجودة */
async function convertToWebP(file, quality = 0.8) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (event) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = img.width;
                canvas.height = img.height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0);
                canvas.toBlob((blob) => {
                    if (blob) {
                        const safeName = file.name || "image.png";
                        const newFileName = safeName.replace(/\.[^/.]+$/, "") + ".webp";
                        resolve(new File([blob], newFileName, { type: 'image/webp' }));
                    } else {
                        reject(new Error("فشل معالجة الصورة"));
                    }
                }, 'image/webp', quality);
            };
            img.onerror = () => reject(new Error("خطأ في قراءة ملف الصورة"));
            img.src = event.target.result;
        };
        reader.onerror = () => reject(new Error("خطأ في قراءة الملف"));
        reader.readAsDataURL(file);
    });
}

/** استخراج مسار الملف من الرابط العام بدقة */
function storagePathFromPublicUrl(url) {
    try {
        const u = new URL(url);
        let path = u.pathname;
        
        const bucketLower = "menu-images";
        const marker = "/" + bucketLower + "/";
        const idx = path.toLowerCase().indexOf(marker);
        
        if (idx !== -1) {
            path = path.substring(idx + marker.length);
        } else {
            const pubMarker = "/object/public/";
            const pubIdx = path.toLowerCase().indexOf(pubMarker);
            if (pubIdx !== -1) {
                let afterPublic = path.substring(pubIdx + pubMarker.length);
                let slashIdx = afterPublic.indexOf('/');
                if (slashIdx !== -1) path = afterPublic.substring(slashIdx + 1);
            }
        }

        while (path.startsWith('/')) path = path.substring(1);
        while (path.toLowerCase().startsWith(bucketLower + "/")) {
            path = path.substring(bucketLower.length + 1);
            while (path.startsWith('/')) path = path.substring(1);
        }
        
        return decodeURIComponent(path);
    } catch (_) {
        return decodeURIComponent(url);
    }
    return null;
}

/** دالة لرفع الصورة إلى Supabase Storage */
async function uploadItemImage(file) {
    const supabase = window.getSupabaseClient();
    if (!supabase) {
        console.error("خطأ: عميل Supabase غير متاح.");
        return { error: "النظام غير متصل" };
    }

    let fileToUpload = file;
    // تحويل تلقائي إلى WebP لتقليل الحجم
    if (file.type !== 'image/webp') {
        try {
            fileToUpload = await convertToWebP(file);
        } catch (e) {
            console.warn("تعذر التحويل، سيتم الرفع بالتنسيق الأصلي:", e);
        }
    }

    // تأمين الاسم وتجنب الأخطاء إذا كانت الصورة بدون اسم
    const originalName = fileToUpload.name || "image.webp";
    const cleanName = originalName.replace(/[^a-zA-Z0-9.]/g, "_");
    const filePath = `assets/${Date.now()}_${cleanName}`;

    // 1. رفع الملف إلى Bucket 'MENU-IMAGES'
    const { data, error } = await supabase.storage
        .from('MENU-IMAGES')
        .upload(filePath, fileToUpload, {
            cacheControl: '3600',
            upsert: true,
            contentType: fileToUpload.type || 'image/webp' // 💡 الحل: إجبار سوبابيس على التعرف على صيغة WebP
        });

    if (error) throw error;

    // 2. الحصول على الرابط العام للصورة
    const { data: urlData } = supabase.storage
        .from('MENU-IMAGES')
        .getPublicUrl(filePath);

    // إضافة رمز منع الكاش (?t=) لضمان ظهور الصورة فور رفعها بدون مشاكل المتصفح
    return { url: urlData.publicUrl + '?t=' + Date.now() };
}

let loaderCount = 0;

/** إخفاء واجهة التحميل عند الجاهزية */
function hideAdminLoader() {
    loaderCount = Math.max(0, loaderCount - 1);
    if (loaderCount === 0) {
        const loader = document.getElementById("admin-loader");
        if (loader) loader.classList.add("hidden");
    }
}

function showAdminLoader() {
    loaderCount++;
    const loader = document.getElementById("admin-loader");
    if (loader) loader.classList.remove("hidden");
}

async function fetchItems() {
    const supabase = window.getSupabaseClient();
    if (!supabase) return;

    try {
        showAdminLoader();
        const { data, error } = await supabase.from('items').select('*');
        if (error) throw error;

        const list = document.getElementById('items-list');
        if (!list) return;

        list.innerHTML = data.map(item => `
            <tr class="border-b">
                <td class="p-2 flex items-center gap-3">
                    <img src="${window.getSafeImageUrl(item.image_url)}" alt="صورة الصنف" class="w-10 h-10 rounded bg-zinc-800 object-cover" onerror="this.src='https://via.placeholder.com/150?text=No+Image'">
                    <span>${item.name}</span>
                </td>
                <td class="p-2">${item.price} ريال</td>
            </tr>
        `).join('');
    } catch (err) {
        console.error("خطأ في جلب البيانات:", err);
    } finally {
        hideAdminLoader();
    }
}

/** جلب الصور من مكتبة الصور */
async function fetchGallery() {
    const container = document.getElementById('gallery-container');
    if (!container) return;

    const supabase = window.getSupabaseClient();
    if (!supabase) return;

    try {
        const { data, error } = await supabase
            .from('gallery')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;

        if (!data || data.length === 0) {
            container.innerHTML = '<p class="text-zinc-500 text-center col-span-full py-10">المكتبة فارغة</p>';
            return;
        }

        container.innerHTML = data.map(img => {
            const safeUrl = window.getSafeImageUrl(img.image_url);
            return `
            <div class="relative group aspect-square rounded-2xl overflow-hidden border border-amber-500/20 bg-zinc-800">
                <img src="${safeUrl}" class="w-full h-full object-cover" alt="${img.name}" loading="lazy">
                <div class="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <button onclick="deleteGalleryItem('${img.id}', '${safeUrl}')" class="p-2 bg-red-500 rounded-full text-white hover:bg-red-400 shadow-lg transition-transform hover:scale-110">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                    </button>
                </div>
            </div>
        `;}).join('');
    } catch (err) {
        console.error("خطأ في جلب المكتبة:", err);
    }
}

/** حذف صورة من المكتبة والستورج */
async function deleteGalleryItem(id, url) {
    if (!confirm("هل أنت متأكد من حذف هذه الصورة نهائياً من المكتبة؟")) return;
    
    const supabase = window.getSupabaseClient();
    if (!supabase) return;

    try {
        showAdminLoader();
        
        // 1. حذف من الجدول
        const { error: dbError } = await supabase.from('gallery').delete().eq('id', id);
        if (dbError) throw dbError;

        // 2. محاولة الحذف من Storage
        const path = storagePathFromPublicUrl(url);
        if (path) {
            const { error: storageErr } = await supabase.storage.from('MENU-IMAGES').remove([path]);
            if (storageErr) console.warn("تنبيه: تم حذف السجل ولكن تعذر حذف الملف الفيزيائي:", storageErr.message);
        }

        fetchGallery();
    } catch (err) {
        console.error("خطأ في الحذف:", err);
        alert("فشل الحذف: " + err.message);
    } finally {
        hideAdminLoader();
    }
}

/** تحديث البيانات عند حدوث تغيير خارجي (Realtime) */
function setupAdminRealtime() {
    const client = window.getSupabaseClient();
    if (!client) return;

    client.channel('admin_changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'items' }, () => fetchItems())
        .on('postgres_changes', { event: '*', schema: 'public', table: 'gallery' }, () => fetchGallery())
        .subscribe();
}

/** تشغيل النظام */
function initAdmin() {
    // 🔒 فرض التنصيص الإجباري: التحقق من صلاحية المدير فقط
    if (typeof checkAccess === "function" && !checkAccess('admin')) {
        window.location.replace("admin-only-login.html");
        return;
    }

    hideAdminLoader();
    fetchItems();
    fetchGallery();
    setupAdminRealtime();
}

window.addEventListener("supabaseReady", initAdmin);
if (document.readyState !== "loading") {
    if (window.getSupabaseClient()) initAdmin();
}

window.uploadItemImage = uploadItemImage;
window.fetchGallery = fetchGallery;
window.deleteGalleryItem = deleteGalleryItem;
