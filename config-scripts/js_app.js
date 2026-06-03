/**
 * ملف: js_app.js
 * تم تعديل الربط ليستخدم window.supabase المهيأ في dependencies.js
 */

window.startOrder = async function(tableNumber) {
    // التأكد من جاهزية Supabase قبل التنفيذ
    if (!window.supabase) {
        console.error("خطأ: Supabase غير مهيأ بعد. تأكد من تحميل dependencies.js أولاً.");
        return alert("النظام غير جاهز، يرجى إعادة المحاولة بعد ثوانٍ.");
    }
    
    try {
        console.log("جاري إرسال الطلب للطاولة:", tableNumber);

        // استخدام window.supabase بدلاً من supabase المباشر
        const { data, error } = await window.supabase
            .from('orders')
            .insert([{ table_no: tableNumber, status: 'confirmed' }])
            .select();

        if (error) {
            console.error("خطأ من قاعدة البيانات:", error);
            alert("حدث خطأ أثناء الاتصال بالسيرفر: " + error.message);
            return;
        }

        // حفظ رقم الطاولة والتحويل للمنيو
        localStorage.setItem('tableNumber', tableNumber);
        window.location.href = 'menu.html';

    } catch (err) {
        console.error("خطأ تقني:", err);
        alert("خطأ غير متوقع: " + err.message);
    }
};
