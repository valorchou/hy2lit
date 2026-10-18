# 保护 sing-box Go Mobile 绑定的 JNI 类与接口不被混淆破坏
-keep class io.nekohasekai.libbox.** { *; }
-keep class go.** { *; }

# ZXing 极简保留
-keep class com.google.zxing.** { *; }

# 极限优化与字节码压缩
-optimizations !code/simplification/arithmetic,!code/simplification/cast,!field/*,!class/merging/*
-optimizationpasses 5
-allowaccessmodification
-dontpreverify

# 剥离所有原生日志调用
-assumenosideeffects class android.util.Log {
    public static boolean isLoggable(java.lang.String, int);
    public static int v(...);
    public static int d(...);
    public static int i(...);
}
