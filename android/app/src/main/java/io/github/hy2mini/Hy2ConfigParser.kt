package io.github.hy2mini

import android.net.Uri
import org.json.JSONArray
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL
import java.util.UUID

data class Hy2Node(
    val id: String = UUID.randomUUID().toString(),
    val remarks: String,
    val rawUri: String,
    val host: String,
    val port: Int,
    val auth: String,
    val sni: String,
    val insecure: Boolean = false,
    val obfsType: String? = null,
    val obfsPassword: String? = null,
    val serverPorts: String? = null,
    val upMbps: Int? = null,
    val downMbps: Int? = null
)

object Hy2ConfigParser {

    /**
     * 解析标准 hy2:// 与 hysteria2:// URI
     * hy2://[auth]@[host]:[port]/?sni=[sni]&insecure=[0|1]&obfs=[salamander]&obfs-password=[pwd]&mport=[port-range]&upmbps=[int]&downmbps=[int]#[remarks]
     */
    fun parseUri(uriString: String): Hy2Node {
        val trimmed = uriString.trim()
        val standardUriString = if (trimmed.startsWith("hysteria2://")) {
            "hy2://" + trimmed.substring(12)
        } else trimmed

        val parsed = Uri.parse(standardUriString)
        val userInfo = parsed.userInfo ?: ""
        val host = parsed.host ?: throw IllegalArgumentException("Missing host in URI")
        val port = if (parsed.port != -1) parsed.port else 443
        val remarks = if (!parsed.fragment.isNullOrBlank()) parsed.fragment!! else "$host:$port"

        val sni = parsed.getQueryParameter("sni")?.takeIf { it.isNotBlank() } ?: host
        val insecure = parsed.getQueryParameter("insecure") == "1"
        val obfs = parsed.getQueryParameter("obfs")
        val obfsPwd = parsed.getQueryParameter("obfs-password")
        val mport = parsed.getQueryParameter("mport")
        val upMbps = parsed.getQueryParameter("upmbps")?.toIntOrNull()
        val downMbps = parsed.getQueryParameter("downmbps")?.toIntOrNull()

        return Hy2Node(
            remarks = remarks,
            rawUri = trimmed,
            host = host,
            port = port,
            auth = userInfo,
            sni = sni,
            insecure = insecure,
            obfsType = obfs,
            obfsPassword = obfsPwd,
            serverPorts = mport?.replace('-', ':'),
            upMbps = upMbps,
            downMbps = downMbps
        )
    }

    /**
     * 动态生成 sing-box 运行配置 JSON
     * routingMode: 0 = 全局代理, 1 = 绕过大陆 IP
     */
    fun buildSingBoxConfig(node: Hy2Node, routingMode: Int, geoipPath: String): String {
        val isBypassCn = routingMode == 1

        val root = JSONObject()

        // 1. log
        root.put("log", JSONObject().put("level", "warn"))

        // 2. dns
        val dnsServers = JSONArray().apply {
            put(JSONObject().apply {
                put("tag", "dns-remote")
                put("address", "https://1.1.1.1/dns-query")
                put("address_resolver", "dns-direct")
                put("detour", "proxy")
            })
            put(JSONObject().apply {
                put("tag", "dns-direct")
                put("address", "223.5.5.5")
                put("detour", "direct")
            })
            put(JSONObject().apply {
                put("tag", "dns-fakeip")
                put("address", "fakeip")
            })
        }
        val dnsRules = JSONArray().apply {
            put(JSONObject().put("outbound", "any").put("server", "dns-direct"))
            put(JSONObject().put("query_type", JSONArray(listOf("A", "AAAA"))).put("server", "dns-fakeip"))
        }
        val fakeip = JSONObject().apply {
            put("enabled", true)
            put("inet4_range", "198.18.0.0/15")
            put("inet6_range", "fc00::/18")
        }
        root.put("dns", JSONObject().apply {
            put("servers", dnsServers)
            put("rules", dnsRules)
            put("fakeip", fakeip)
            put("independent_cache", true)
        })

        // 3. inbounds (tun)
        val tunInbound = JSONObject().apply {
            put("type", "tun")
            put("tag", "tun-in")
            put("interface_name", "tun0")
            put("inet4_address", "172.19.0.1/30")
            put("inet6_address", "fdfe:dcba:9876::1/126")
            put("mtu", 1400)
            put("auto_route", true)
            put("strict_route", true)
            put("stack", "system")
            put("sniff", true)
            put("sniff_override_destination", false)
        }
        root.put("inbounds", JSONArray().put(tunInbound))

        // 4. outbounds
        val hy2Outbound = JSONObject().apply {
            put("type", "hysteria2")
            put("tag", "proxy")
            put("server", node.host)
            put("server_port", node.port)
            put("password", node.auth)
            put("tls", JSONObject().apply {
                put("enabled", true)
                put("server_name", node.sni)
                put("insecure", node.insecure)
            })
            if (!node.serverPorts.isNullOrBlank()) {
                put("server_ports", JSONArray().put(node.serverPorts))
            }
            if (!node.obfsType.isNullOrBlank()) {
                put("obfs", JSONObject().apply {
                    put("type", node.obfsType)
                    put("password", node.obfsPassword ?: "")
                })
            }
            if (node.upMbps != null && node.upMbps > 0) put("up_mbps", node.upMbps)
            if (node.downMbps != null && node.downMbps > 0) put("down_mbps", node.downMbps)
        }
        root.put("outbounds", JSONArray().apply {
            put(hy2Outbound)
            put(JSONObject().put("type", "direct").put("tag", "direct"))
            put(JSONObject().put("type", "block").put("tag", "block"))
            put(JSONObject().put("type", "dns").put("tag", "dns-out"))
        })

        // 5. route
        val routeRules = JSONArray().apply {
            put(JSONObject().put("protocol", "dns").put("outbound", "dns-out"))
            put(JSONObject().put("ip_is_private", true).put("outbound", "direct"))
            if (isBypassCn) {
                put(JSONObject().put("rule_set", JSONArray().put("geoip-cn")).put("outbound", "direct"))
            }
        }
        val route = JSONObject().apply {
            put("rules", routeRules)
            put("auto_detect_interface", true)
            put("final", "proxy")
            if (isBypassCn) {
                put("rule_set", JSONArray().put(JSONObject().apply {
                    put("type", "local")
                    put("tag", "geoip-cn")
                    put("format", "binary")
                    put("path", geoipPath)
                }))
            }
        }
        root.put("route", route)

        return root.toString(2)
    }

    /**
     * 15 行真连接测速实现：直连 Cloudflare 204 生成接口测试 RTT 延迟
     */
    fun testRealLatency(): Long {
        val start = System.currentTimeMillis()
        var conn: HttpURLConnection? = null
        return try {
            val url = URL("http://cp.cloudflare.com/generate_204")
            conn = (url.openConnection() as HttpURLConnection).apply {
                connectTimeout = 4000
                readTimeout = 4000
                instanceFollowRedirects = false
                useCaches = false
                requestMethod = "GET"
            }
            val code = conn.responseCode
            if (code == 204 || code in 200..299) {
                System.currentTimeMillis() - start
            } else -1L
        } catch (_: Exception) {
            -1L
        } finally {
            conn?.disconnect()
        }
    }
}
