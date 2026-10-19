plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

android {
    namespace = "io.github.hy2mini"
    compileSdk = 35

    defaultConfig {
        applicationId = "io.github.hy2mini"
        minSdk = 26
        targetSdk = 35
        versionCode = 1
        versionName = "1.0.0"

        // 仅保留 64 位 ARM 架构，绝不打入 32 位与 x86 so
        ndk {
            abiFilters.clear()
            abiFilters.add("arm64-v8a")
        }
    }

    buildTypes {
        release {
            isMinifyEnabled = true
            isShrinkResources = true
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro"
            )
            signingConfig = signingConfigs.getByName("debug") // 开发调试签名
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
}

kotlin {
    jvmToolchain(17)
}

dependencies {
    // 引入编译裁剪产出的 libbox.aar
    implementation(files("libs/libbox.aar"))

    // 仅引入 ZXing core (纯纯二维码算法，无冗余 Android 组件)
    implementation("com.google.zxing:core:3.5.3")

    // 严禁引入: androidx.appcompat, material, okhttp, gson, camerax
}
