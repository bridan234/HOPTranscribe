#!/bin/sh
# Replace env vars in JavaScript files at runtime
# This allows environment variables to be set at container runtime instead of build time

ROOT_DIR=/usr/share/nginx/html

# Replace placeholders in all JS files
for file in $ROOT_DIR/assets/*.js;
do
  if [ -f "$file" ]; then
    echo "Processing $file ..."
    
    # Replace VITE_API_BASE_URL placeholder with actual environment variable
    if [ ! -z "$VITE_API_BASE_URL" ]; then
      sed -i "s|__VITE_API_BASE_URL__|$VITE_API_BASE_URL|g" "$file"
    fi
    
    # Replace Application Insights connection string placeholder
    if [ ! -z "$APPLICATIONINSIGHTS_CONNECTION_STRING" ]; then
      sed -i "s|__APPLICATIONINSIGHTS_CONNECTION_STRING__|$APPLICATIONINSIGHTS_CONNECTION_STRING|g" "$file"
    fi
  fi
done

echo "Environment variables injected successfully!"

# Start nginx
exec "$@"
