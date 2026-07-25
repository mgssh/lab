terraform {
  required_version = ">= 1.6"
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 4.14"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.6"
    }
  }
}


provider "azurerm" {
  features {}
}

variable "location" {
  type    = string
  default = "brazilsouth"
}

variable "prefix" {
  type    = string
  default = "books"
}

resource "random_string" "suffix" {
  length  = 6
  special = false
  upper   = false

  numeric = true
}


resource "azurerm_resource_group" "tfstate" {
  name     = "rg-tfstate-${var.prefix}"
  location = var.location
}

resource "azurerm_storage_account" "tfstate" {
  name                     = "sttfstate${var.prefix}${random_string.suffix.result}"
  resource_group_name      = azurerm_resource_group.tfstate.name
  location                 = azurerm_resource_group.tfstate.location
  account_tier             = "Standard"
  account_replication_type = "LRS"
  min_tls_version          = "TLS1_2"

  allow_nested_items_to_be_public = false

  blob_properties {
    versioning_enabled = true


    delete_retention_policy {
      days = 7
    }
  }
}

resource "azurerm_storage_container" "tfstate" {
  name                  = "tfstate"
  storage_account_name  = azurerm_storage_account.tfstate.name
  container_access_type = "private"
}

output "backend_config" {
  value = <<-EOT

    resource_group_name  = "${azurerm_resource_group.tfstate.name}"
    storage_account_name = "${azurerm_storage_account.tfstate.name}"
    container_name       = "${azurerm_storage_container.tfstate.name}"
    key                  = "dev.tfstate"

  EOT
}
