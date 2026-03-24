class InsuranceAuthorization:
    def verify_coverage(self, patient, procedure):
        return True


AutorizacaoSeguro = InsuranceAuthorization
InsuranceAuthorization.verificar_cobertura = InsuranceAuthorization.verify_coverage
