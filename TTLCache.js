class TTLCache {

    constructor() {
        this.cache = new Map();
    }

    put(key, value, ttl) {
        this.cache.set(key, { value, expiry: Date.now() + ttl });
    }

    get(key) {
        const entry = this.cache.get(key);
        if (!entry || Date.now() > entry.expiry) {
            this.cache.delete(key); // Auto-remove expired entry
            return null; // Cache miss
        }
        return entry.value;
    }

}

export { TTLCache as default };
