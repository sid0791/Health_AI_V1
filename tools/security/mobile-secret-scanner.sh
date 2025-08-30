#!/bin/bash

# Mobile App Secret Scanner
# Implements Phase 7 requirement: "Static analysis for secret detection"
# Scans mobile app code for hardcoded secrets, API keys, tokens, etc.

set -euo pipefail

# Colors for output
RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
MOBILE_APPS_DIR="apps/mobile"
SCAN_EXTENSIONS=("swift" "kt" "ts" "tsx" "js" "jsx" "json" "plist" "xml")
REPORT_FILE="secret-scan-report.json"

# Patterns to detect secrets
declare -A SECRET_PATTERNS=(
    ["API_KEY"]="(?i)(api[_-]?key|apikey)[\"'\s]*[=:][\"'\s]*[a-zA-Z0-9]{16,}"
    ["ACCESS_TOKEN"]="(?i)(access[_-]?token|accesstoken)[\"'\s]*[=:][\"'\s]*[a-zA-Z0-9]{20,}"
    ["SECRET_KEY"]="(?i)(secret[_-]?key|secretkey)[\"'\s]*[=:][\"'\s]*[a-zA-Z0-9]{16,}"
    ["AUTH_TOKEN"]="(?i)(auth[_-]?token|authtoken)[\"'\s]*[=:][\"'\s]*[a-zA-Z0-9]{16,}"
    ["BEARER_TOKEN"]="(?i)bearer\s+[a-zA-Z0-9]{20,}"
    ["JWT_TOKEN"]="(?i)jwt[\"'\s]*[=:][\"'\s]*eyJ[a-zA-Z0-9\-_]+"
    ["DATABASE_URL"]="(?i)(database[_-]?url|db[_-]?url)[\"'\s]*[=:][\"'\s]*[a-zA-Z0-9+/:@.-]+"
    ["FIREBASE_KEY"]="(?i)firebase[\"'\s]*[=:][\"'\s]*[a-zA-Z0-9\-_]+"
    ["GOOGLE_API_KEY"]="(?i)AIza[0-9A-Za-z\-_]{35}"
    ["STRIPE_KEY"]="(?i)(sk|pk)_(test|live)_[0-9a-zA-Z]{24,}"
    ["TWILIO_SID"]="(?i)AC[a-z0-9]{32}"
    ["AWS_KEY"]="(?i)(aws[_-]?access[_-]?key[_-]?id|aws[_-]?secret[_-]?access[_-]?key)[\"'\s]*[=:][\"'\s]*[A-Z0-9]{16,}"
    ["GITHUB_TOKEN"]="(?i)gh[pousr]_[A-Za-z0-9]{36}"
    ["PRIVATE_KEY"]="-----BEGIN (RSA |EC |DSA )?PRIVATE KEY-----"
    ["HARDCODED_PASSWORD"]="(?i)(password|pwd|pass)[\"'\s]*[=:][\"'\s]*[a-zA-Z0-9!@#$%^&*()]{8,}"
)

# Allowlist patterns (legitimate usage)
declare -A ALLOWLIST_PATTERNS=(
    ["TEST_PLACEHOLDER"]="(test|example|placeholder|demo|mock)"
    ["COMMENT"]="^\s*(//|#|\*|<!--)"
    ["LOG_STATEMENT"]="(console\.log|print|NSLog|Log\.|logger\.|debug|info)"
    ["VARIABLE_DECLARATION"]="(let|var|const|@State|@Published)\s+\w+\s*(:|=)"
)

# Statistics
total_files=0
scanned_files=0
issues_found=0
critical_issues=0
warnings=0

# Initialize report
initialize_report() {
    cat > "$REPORT_FILE" << EOF
{
  "scan_info": {
    "timestamp": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
    "scanner": "mobile-secret-scanner",
    "version": "1.0.0",
    "directory": "$MOBILE_APPS_DIR"
  },
  "summary": {
    "total_files": 0,
    "scanned_files": 0,
    "issues_found": 0,
    "critical_issues": 0,
    "warnings": 0
  },
  "findings": []
}
EOF
}

# Print banner
print_banner() {
    echo -e "${BLUE}================================${NC}"
    echo -e "${BLUE} Mobile App Secret Scanner v1.0 ${NC}"
    echo -e "${BLUE}================================${NC}"
    echo -e "Scanning: ${MOBILE_APPS_DIR}"
    echo -e "Report: ${REPORT_FILE}"
    echo ""
}

# Check if line is in allowlist
is_allowlisted() {
    local line="$1"
    local file="$2"
    
    # Check if it's a test file
    if [[ "$file" =~ (test|spec|mock|example|demo) ]]; then
        return 0
    fi
    
    # Check allowlist patterns
    for pattern in "${ALLOWLIST_PATTERNS[@]}"; do
        if echo "$line" | grep -qE "$pattern"; then
            return 0
        fi
    done
    
    return 1
}

# Classify issue severity
get_severity() {
    local pattern_name="$1"
    local file="$2"
    
    # Critical for production keys
    case "$pattern_name" in
        "PRIVATE_KEY"|"AWS_KEY"|"STRIPE_KEY"|"DATABASE_URL")
            echo "CRITICAL"
            ;;
        "API_KEY"|"ACCESS_TOKEN"|"SECRET_KEY"|"AUTH_TOKEN"|"BEARER_TOKEN"|"JWT_TOKEN")
            if [[ "$file" =~ (production|prod|release) ]]; then
                echo "CRITICAL"
            else
                echo "HIGH"
            fi
            ;;
        "FIREBASE_KEY"|"GOOGLE_API_KEY"|"TWILIO_SID"|"GITHUB_TOKEN")
            echo "HIGH"
            ;;
        "HARDCODED_PASSWORD")
            echo "MEDIUM"
            ;;
        *)
            echo "LOW"
            ;;
    esac
}

# Add finding to report
add_finding() {
    local file="$1"
    local line_num="$2"
    local line_content="$3"
    local pattern_name="$4"
    local severity="$5"
    
    # Escape JSON special characters
    line_content=$(echo "$line_content" | sed 's/\\/\\\\/g; s/"/\\"/g; s/\t/\\t/g')
    
    # Create temporary file for finding
    local temp_finding=$(mktemp)
    cat > "$temp_finding" << EOF
{
  "file": "$file",
  "line": $line_num,
  "content": "$line_content",
  "pattern": "$pattern_name",
  "severity": "$severity",
  "description": "Potential hardcoded secret detected"
}
EOF
    
    # Add to findings array in report
    jq ".findings += [$(cat "$temp_finding")]" "$REPORT_FILE" > "${REPORT_FILE}.tmp" && mv "${REPORT_FILE}.tmp" "$REPORT_FILE"
    rm "$temp_finding"
    
    # Update counters
    issues_found=$((issues_found + 1))
    if [[ "$severity" == "CRITICAL" ]]; then
        critical_issues=$((critical_issues + 1))
    elif [[ "$severity" == "HIGH" || "$severity" == "MEDIUM" ]]; then
        warnings=$((warnings + 1))
    fi
}

# Scan single file
scan_file() {
    local file="$1"
    local relative_file="${file#./}"
    
    scanned_files=$((scanned_files + 1))
    
    echo -e "Scanning: ${relative_file}"
    
    local line_num=0
    while IFS= read -r line; do
        line_num=$((line_num + 1))
        
        # Skip empty lines
        [[ -z "$line" ]] && continue
        
        # Check each secret pattern
        for pattern_name in "${!SECRET_PATTERNS[@]}"; do
            pattern="${SECRET_PATTERNS[$pattern_name]}"
            
            if echo "$line" | grep -qE "$pattern"; then
                # Check if allowlisted
                if is_allowlisted "$line" "$relative_file"; then
                    continue
                fi
                
                severity=$(get_severity "$pattern_name" "$relative_file")
                
                # Print finding
                case "$severity" in
                    "CRITICAL")
                        echo -e "${RED}  🔴 CRITICAL: $pattern_name at line $line_num${NC}"
                        ;;
                    "HIGH")
                        echo -e "${RED}  🟠 HIGH: $pattern_name at line $line_num${NC}"
                        ;;
                    "MEDIUM")
                        echo -e "${YELLOW}  🟡 MEDIUM: $pattern_name at line $line_num${NC}"
                        ;;
                    *)
                        echo -e "${BLUE}  🔵 LOW: $pattern_name at line $line_num${NC}"
                        ;;
                esac
                
                # Add to report
                add_finding "$relative_file" "$line_num" "$line" "$pattern_name" "$severity"
            fi
        done
    done < "$file"
}

# Find and scan files
scan_files() {
    echo -e "${GREEN}Finding files to scan...${NC}"
    
    # Build find command for extensions
    local find_cmd="find ./$MOBILE_APPS_DIR -type f"
    local first=true
    
    find_cmd+=" \("
    for ext in "${SCAN_EXTENSIONS[@]}"; do
        if $first; then
            find_cmd+=" -name \"*.$ext\""
            first=false
        else
            find_cmd+=" -o -name \"*.$ext\""
        fi
    done
    find_cmd+=" \)"
    
    # Execute find and scan files
    while IFS= read -r -d '' file; do
        total_files=$((total_files + 1))
        
        # Skip certain directories
        if [[ "$file" =~ (node_modules|\.git|build|dist|\.gradle|DerivedData) ]]; then
            continue
        fi
        
        scan_file "$file"
    done < <(eval "$find_cmd -print0")
}

# Update report summary
update_summary() {
    jq ".summary.total_files = $total_files | 
        .summary.scanned_files = $scanned_files |
        .summary.issues_found = $issues_found |
        .summary.critical_issues = $critical_issues |
        .summary.warnings = $warnings" "$REPORT_FILE" > "${REPORT_FILE}.tmp" && mv "${REPORT_FILE}.tmp" "$REPORT_FILE"
}

# Print summary
print_summary() {
    echo ""
    echo -e "${BLUE}================================${NC}"
    echo -e "${BLUE}           SCAN SUMMARY          ${NC}"
    echo -e "${BLUE}================================${NC}"
    echo -e "Total files found: $total_files"
    echo -e "Files scanned: $scanned_files"
    echo -e "Issues found: $issues_found"
    
    if [[ $critical_issues -gt 0 ]]; then
        echo -e "${RED}Critical issues: $critical_issues${NC}"
    else
        echo -e "${GREEN}Critical issues: $critical_issues${NC}"
    fi
    
    if [[ $warnings -gt 0 ]]; then
        echo -e "${YELLOW}Warnings: $warnings${NC}"
    else
        echo -e "${GREEN}Warnings: $warnings${NC}"
    fi
    
    echo ""
    echo -e "Report saved to: ${REPORT_FILE}"
    
    # Exit with error if critical issues found
    if [[ $critical_issues -gt 0 ]]; then
        echo -e "${RED}❌ Scan failed: Critical security issues found!${NC}"
        exit 1
    elif [[ $issues_found -gt 0 ]]; then
        echo -e "${YELLOW}⚠️  Scan completed with warnings${NC}"
        exit 0
    else
        echo -e "${GREEN}✅ Scan passed: No secrets found!${NC}"
        exit 0
    fi
}

# Main execution
main() {
    print_banner
    
    # Check if mobile apps directory exists
    if [[ ! -d "$MOBILE_APPS_DIR" ]]; then
        echo -e "${RED}Error: Directory $MOBILE_APPS_DIR not found!${NC}"
        exit 1
    fi
    
    # Check dependencies
    if ! command -v jq &> /dev/null; then
        echo -e "${RED}Error: jq is required but not installed!${NC}"
        exit 1
    fi
    
    initialize_report
    scan_files
    update_summary
    print_summary
}

# Run if executed directly
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi