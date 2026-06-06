// [كود محسن لعرض البيانات]

/** دالة لرفع الصورة إلى Supabase Storage */
async function uploadItemImage(file) {
    console.log("1. بدء عملية الرفع إلى Storage...");
    const supabase = window.getSupabaseClient();
    if (!supabase) {
        console.error("خطأ: عميل Supabase غير متاح.");
        return { error: "النظام غير متصل" };
    }

    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random()}.${fileExt}`;
    const filePath = `items/${fileName}`;

    // 1. رفع الملف إلى Bucket 'menu-images'
    const { data, error } = await supabase.storage
        .from('menu-images')
        .upload(filePath, file, {
            cacheControl: '3600',
            upsert: false
        });

    console.log("2. انتهت محاولة الرفع للستورج. النتيجة:", { data, error });

    if (error) throw error;

    // 2. الحصول على الرابط العام للصورة
    const { data: urlData } = supabase.storage
        .from('menu-images')
        .getPublicUrl(filePath);

    return { url: urlData.publicUrl };
}

/** إخفاء واجهة التحميل عند الجاهزية */
function hideAdminLoader() {
    const loader = document.getElementById("admin-loader");
    if (loader) loader.classList.add("hidden");
}

function showAdminLoader() {
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
                <td class="p-2">${item.name}</td>
                <td class="p-2">${item.price} ريال</td>
            </tr>
        `).join('');
    } catch (err) {
        console.error("خطأ في جلب البيانات:", err);
    } finally {
        hideAdminLoader();
    }
}

/** تشغيل النظام */
function initAdmin() {
    hideAdminLoader();
    fetchItems();
}

window.addEventListener("supabaseReady", initAdmin);
if (document.readyState !== "loading") {
    if (window.getSupabaseClient()) initAdmin();
}

window.uploadItemImage = uploadItemImage;
