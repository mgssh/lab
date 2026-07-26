variable "prefix" {
  type = string
}

variable "location" {
  type = string
}

variable "resource_group_name" {
  type = string
}

variable "key_vault_id" {
  type = string
}

variable "sku_name" {
  type    = string
  default = "B_Standard_B1ms"
}

variable "storage_mb" {
  type    = number
  default = 32768
}

resource "random_password" "postgres_admin" {
  length  = 24
  special = true
  override_special = "-_"
}

resource "azurerm_postgresql_flexible_server" "this" {
  name                = "psql-${var.prefix}"
  location            = var.location
  resource_group_name = var.resource_group_name

  version  = "16"
  sku_name = var.sku_name

  storage_mb = var.storage_mb

  administrator_login    = "mathadmin"
  administrator_password = random_password.postgres_admin.result

  public_network_access_enabled = true

  backup_retention_days        = 7
  geo_redundant_backup_enabled = false

  zone = "1"
}

resource "azurerm_postgresql_flexible_server_firewall_rule" "allow_azure_services" {
  name             = "AllowAzureServices"
  server_id        = azurerm_postgresql_flexible_server.this.id
  start_ip_address = "0.0.0.0"
  end_ip_address   = "0.0.0.0"
}

resource "azurerm_postgresql_flexible_server_database" "mathapp" {
  name      = "mathapp"
  server_id = azurerm_postgresql_flexible_server.this.id
  collation = "en_US.utf8"
  charset   = "utf8"
}

resource "azurerm_key_vault_secret" "postgres_password" {
  name         = "postgres-admin-password"
  value        = random_password.postgres_admin.result
  key_vault_id = var.key_vault_id
}

resource "azurerm_key_vault_secret" "postgres_connection_string" {
  name         = "postgres-connection-string"
  value        = "postgresql://mathadmin:${random_password.postgres_admin.result}@${azurerm_postgresql_flexible_server.this.fqdn}:5432/mathapp?sslmode=require"
  key_vault_id = var.key_vault_id
}

output "server_fqdn" {
  value = azurerm_postgresql_flexible_server.this.fqdn
}

output "database_name" {
  value = azurerm_postgresql_flexible_server_database.mathapp.name
}
