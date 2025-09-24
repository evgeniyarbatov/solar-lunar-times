variable "aws_region" {
  type    = string
  default = "ap-southeast-1"
}

variable "s3_bucket" {
  type    = string
  default = "sunmoon.gritcuriosityandperseverance.org"
}

variable "s3_bucket_dir" {
  type    = string
  default = "../site/dist"
}