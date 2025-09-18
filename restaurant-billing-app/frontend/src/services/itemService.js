import api from "./apiService";

export const itemService = {
  async createItem(itemData) {
    const response = await api.post("/items", itemData);
    return response.item;
  },

  async getItem(itemCode) {
    const response = await api.get(`/items/${itemCode}`);
    return response.item;
  },

  async getAllItems(limit = 100, offset = 0) {
    const response = await api.get(`/items?limit=${limit}&offset=${offset}`);
    return response.items;
  },

  async searchItems(query, limit = 20) {
    const response = await api.get(
      `/items/search?query=${encodeURIComponent(query)}&limit=${limit}`
    );
    return response.items;
  },

  async getItemsByCategory(category) {
    const response = await api.get(
      `/items?category=${encodeURIComponent(category)}`
    );
    return response.items;
  },

  async getItemsByGroup(group) {
    const response = await api.get(`/items?group=${encodeURIComponent(group)}`);
    return response.items;
  },

  async updateItem(itemId, updates) {
    const response = await api.put(`/items/${itemId}`, updates);
    return response.item;
  },

  async deleteItem(itemId) {
    const response = await api.delete(`/items/${itemId}`);
    return response.item;
  },

  async getCategories() {
    const response = await api.get("/items/categories");
    return response.categories;
  },

  async getItemGroups() {
    const response = await api.get("/items/groups");
    return response.groups;
  },
};
