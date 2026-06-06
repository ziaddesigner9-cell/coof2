<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>لوحة دخول الموظفين</title>
    
    <script src="config-scripts/js_auth_config.js"></script>

    <script src="https://cdn.tailwindcss.com"></script>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;700;900&display=swap" rel="stylesheet">
    <style>
        body { font-family: 'Cairo', sans-serif; }
    </style>
</head>
<body class="bg-black text-zinc-100 min-h-screen flex items-center justify-center p-4 relative overflow-x-hidden">

    <div class="absolute top-1/4 left-1/4 w-96 h-96 bg-amber-500/10 rounded-full blur-[120px] pointer-events-none"></div>
    <div class="absolute bottom-1/4 right-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-[120px] pointer-events-none"></div>

    <div class="w-full max-w-md mx-auto z-10 space-y-8">
        
        <div class="text-center space-y-2">
            <div class="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-zinc-900 border border-zinc-800 shadow-2xl mb-2 text-3xl">
                👨‍🍳
            </div>
            <h1 class="text-3xl font-black tracking-tight text-white bg-gradient-to-r from-zinc-100 to-zinc-400 bg-clip-text text-transparent">
                بوابة الموظفين الرقمية
            </h1>
            <p class="text-sm text-zinc-400">مرحباً بك مجدداً، يرجى اختيار قسمك لتسجيل الدخول</p>
        </div>

        <div class="space-y-5">
            
            <div class="group bg-zinc-900/40 backdrop-blur-md p-6 rounded-3xl border border-zinc-800/80 hover:border-amber-500/40 shadow-2xl transition-all duration-300">
                <div class="flex items-center gap-3 mb-4">
                    <span class="text-2xl p-2 bg-amber-500/10 rounded-xl text-amber-500 group-hover:scale-110 transition-transform">🔐</span>
                    <div>
                        <h2 class="text-lg font-bold text-amber-500">لوحة المطبخ</h2>
                        <p class="text-xs text-zinc-500">إدارة وتجهيز الطلبات الحالية</p>
                    </div>
                </div>
                
                <div class="space-y-3">
                    <input type="password" id="workerPassInput" 
                           class="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-4 text-white text-center text-xl tracking-widest placeholder:tracking-normal focus:border-amber-500/60 focus:ring-1 focus:ring-amber-500/30 outline-none transition" 
                           placeholder="••••••••">
                    <button onclick="handleAuth('worker')" 
                            class="w-full bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-black font-black py-3.5 rounded-xl transition-all duration-300 shadow-lg shadow-amber-950/20 active:scale-[0.98]">
                        دخول المطبخ ←
                    </button>
                </div>
            </div>

            <div class="group bg-zinc-900/40 backdrop-blur-md p-6 rounded-3xl border border-zinc-800/80 hover:border-emerald-500/40 shadow-2xl transition-all duration-300">
                <div class="flex items-center gap-3 mb-4">
                    <span class="text-2xl p-2 bg-emerald-500/10 rounded-xl text-emerald-500 group-hover:scale-110 transition-transform">🚚</span>
                    <div>
                        <h2 class="text-lg font-bold text-emerald-500">نظام التوصيل</h2>
                        <p class="text-xs text-zinc-500">استلام الطلبات الجاهزة وتوصيلها</p>
                    </div>
                </div>
                
                <div class="space-y-3">
                    <input type="password" id="deliveryPassInput" 
                           class="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-4 text-white text-center text-xl tracking-widest placeholder:tracking-normal focus:border-emerald-500/60 focus:ring-1 focus:ring-emerald-500/30 outline-none transition" 
                           placeholder="••••••••">
                    <button onclick="handleAuth('delivery')" 
                            class="w-full bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-black py-3.5 rounded-xl transition-all duration-300 shadow-lg shadow-emerald-950/20 active:scale-[0.98]">
                        دخول السائق ←
                    </button>
                </div>
            </div>

        </div>

        <p class="text-center text-xs text-zinc-600 tracking-wide">جميع الحقوق محفوظة © النظام الذكي لإدارة المطاعم</p>
    </div>

    <script>
    function handleAuth(role) {
        const inputId = role === 'worker' ? 'workerPassInput' : 'deliveryPassInput';
        const password = document.getElementById(inputId).value;
        
        console.log("محاولة تسجيل دخول للدور:", role);

        // التحقق من تحميل الملف من مجلد config-scripts
        if (typeof verifyLogin === "function") {
            if (verifyLogin(password, role)) {
                console.log("تم التحقق بنجاح! جاري التوجيه...");
                if (role === 'worker') {
                    window.location.href = 'kitchen.html';
                } else {
                    window.location.href = 'delivery_orders.html';
                }
            } else {
                alert("⚠️ كلمة المرور غير صحيحة، يرجى المحاولة مرة أخرى.");
            }
        } else {
            console.error("خطأ: دالة verifyLogin غير معرفة. تأكد من مسار ملف config-scripts/js_auth_config.js");
            alert("⚠️ خطأ في النظام: لم نتمكن من الوصول لملف الحماية بمجلد config-scripts.");
        }
    }
    </script>
</body>
</html>